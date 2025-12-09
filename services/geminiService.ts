import { GoogleGenAI } from "@google/genai";
import { TokenUsageMetadata, GenerationResult } from "../types";

// Initialize Gemini Client
// vite.config.ts에서 process.env.GEMINI_API_KEY로 주입됨
// 로컬: .env 파일의 GEMINI_API_KEY
// Vercel: 환경 변수의 GEMINI_API_KEY
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '' 
});

const DEFAULT_SYSTEM_INSTRUCTION = `
당신은 'Supernova', 세계 최고 수준의 디자인 엔지니어 AI입니다.
사용자의 요청에 따라 창의적이고 고품질의 랜딩 페이지를 생성합니다.

## 핵심 원칙
- 사용자의 프롬프트와 이미지 레퍼런스를 최우선으로 따릅니다
- 별도의 디자인 가이드 없이 창의적으로 디자인합니다
- 모던하고 전문적인 느낌의 랜딩 페이지를 생성합니다

## 출력 규칙
- 단일 HTML 파일로 반환 (마크다운 래핑 금지)
- <!DOCTYPE html>로 시작

## 기술 스택
\`\`\`html
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
<script src="https://unpkg.com/lucide@latest"></script>
<style>body { font-family: 'Pretendard', sans-serif; }</style>
<!-- body 끝에: <script>lucide.createIcons();</script> -->
\`\`\`

## 텍스트 규칙
- 모든 텍스트는 **한글**로 작성 (영어 금지)
- 제목: 10-15자, 부제목: 1-2줄, 버튼: 3-5자

## 이미지
- Unsplash: https://images.unsplash.com/photo-[id]?auto=format&fit=crop&w=1200&q=80

## 기존 코드가 있을 때
- 수정 요청 → 기존 코드 수정
- 새 요청 → 처음부터 생성
- 항상 전체 HTML 반환
`;

const IMAGE_REFERENCE_INSTRUCTION = `
당신은 'Supernova', 세계 최고 수준의 디자인 엔지니어 AI입니다.
사용자가 제공한 **레퍼런스 이미지**를 바탕으로 프로덕션 수준의 웹 페이지를 생성합니다.

## 핵심 지침
1. **이미지 우선**: 제공된 이미지의 레이아웃, 색상, 타이포그래피, 여백을 최우선으로 따릅니다. 기존 디자인 가이드라인보다 이미지의 스타일을 우선시하세요.
2. **시각적 분석**: 이미지의 구조, 컴포넌트 배치, 스타일링을 정밀하게 분석하여 코드로 구현하세요.
3. **텍스트**: 모든 텍스트는 **한글**로 변환하여 작성하세요. 문맥에 맞는 자연스러운 한국어를 사용하세요.

## 기술 스택
\`\`\`html
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
<script src="https://unpkg.com/lucide@latest"></script>
<style>body { font-family: 'Pretendard', sans-serif; }</style>
<!-- body 끝에: <script>lucide.createIcons();</script> -->
\`\`\`

## 출력 규칙
- 단일 HTML 파일로 반환 (마크다운 래핑 금지)
- <!DOCTYPE html>로 시작
- 항상 전체 HTML 반환
`;

export type ModelType = 'pro' | 'fast';

// 스트리밍 결과 타입
export interface StreamResult {
  text: string;
  tokenUsage: TokenUsageMetadata;
}

export const generateDesignStream = async (
  prompt: string,
  images: string[], // 여러 이미지 지원
  previousCode: string | undefined,
  modelType: ModelType,
  onChunk: (text: string) => void
): Promise<StreamResult> => {
  try {
    let finalPrompt = prompt;
    
    // 이미지가 있는지 확인
    const hasImages = images && images.length > 0;
    
    // 적절한 시스템 인스트럭션 선택
    const systemInstruction = hasImages ? IMAGE_REFERENCE_INSTRUCTION : DEFAULT_SYSTEM_INSTRUCTION;
    
    // Inject context if this is an iteration
    if (previousCode) {
      finalPrompt = `
      USER REQUEST: ${prompt}

      --------------------------------------------------
      CONTEXT (Previous Component Code):
      ${previousCode}
      --------------------------------------------------
      
      Instructions:
      1. If the user request implies a new component (e.g., "create a login page"), ignore the specific structure of the Previous Code and build a fresh design.
      2. If the user request implies an edit (e.g., "make the title bigger"), modify the Previous Code.
      3. ${hasImages ? 'Follow the reference image style primarily.' : 'Always adhere to the Modern Minimal Design System.'}
      4. Return the FULL updated/new HTML file.
      `;
    }

    const modelName = modelType === 'pro' ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
    
    // Only apply thinking config for the Pro model
    const config: any = {
      systemInstruction: systemInstruction,
    };

    if (modelType === 'pro') {
      config.thinkingConfig = {
        thinkingBudget: 4092,
      };
    }

    // Prepare contents with multiple images support
    const parts: any[] = [];
    
    // 여러 이미지 추가
    if (images && images.length > 0) {
      images.forEach((imageBase64, index) => {
        // Remove data URL prefix if present (e.g., "data:image/png;base64,")
        const base64Data = imageBase64.split(',')[1] || imageBase64;
        
        // Detect mime type from data URL
        let mimeType = "image/png";
        if (imageBase64.startsWith('data:')) {
          const match = imageBase64.match(/^data:([^;]+);/);
          if (match) mimeType = match[1];
        }
        
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
      });
      
      // If prompt is empty but images exist, add a default prompt
      if (!finalPrompt.trim()) {
        if (images.length === 1) {
          finalPrompt = "Create a web component based on this reference image.";
        } else {
          finalPrompt = `Create a web component based on these ${images.length} reference images. Analyze the common design patterns, layout structure, color scheme, and visual style from all images and create a cohesive design.`;
        }
      } else if (images.length > 1) {
        // 여러 이미지가 있을 때 프롬프트 보강
        finalPrompt = `${finalPrompt}\n\n[Note: ${images.length} reference images have been provided. Please analyze all images for design inspiration including layout, colors, typography, and visual elements.]`;
      }
    }
    
    parts.push({ text: finalPrompt });

    const responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: parts,
        },
      ],
      config: config,
    });

    let fullText = '';
    let tokenUsage: TokenUsageMetadata = {
      promptTokenCount: 0,
      candidatesTokenCount: 0,
      totalTokenCount: 0,
    };

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(text);
      }
      
      // 토큰 사용량 업데이트 (마지막 청크에 포함됨)
      if (chunk.usageMetadata) {
        tokenUsage = {
          promptTokenCount: chunk.usageMetadata.promptTokenCount || 0,
          candidatesTokenCount: chunk.usageMetadata.candidatesTokenCount || 0,
          totalTokenCount: chunk.usageMetadata.totalTokenCount || 0,
        };
      }
    }

    return {
      text: fullText,
      tokenUsage,
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const extractHtml = (response: string): string => {
  // 1. Try to find code block with closing backticks
  const match = response.match(/```html([\s\S]*?)```/);
  if (match && match[1]) {
    return match[1].trim();
  }

  // 2. Try to find code block start only (streaming scenario)
  const startMatch = response.match(/```html([\s\S]*)/);
  if (startMatch && startMatch[1]) {
    const content = startMatch[1];
    // Check if we have DOCTYPE or html tag inside the block
    const docTypeIndex = content.indexOf('<!DOCTYPE html>');
    const htmlTagIndex = content.indexOf('<html');
    
    if (docTypeIndex !== -1) return content.substring(docTypeIndex);
    if (htmlTagIndex !== -1) return content.substring(htmlTagIndex);
    
    return content;
  }

  // 3. Fallback: look for DOCTYPE or html tag in raw response
  const docTypeIndex = response.indexOf('<!DOCTYPE html>');
  if (docTypeIndex !== -1) {
    return response.substring(docTypeIndex);
  }
  
  const htmlTagIndex = response.indexOf('<html');
  if (htmlTagIndex !== -1) {
    return response.substring(htmlTagIndex);
  }

  return response;
};
