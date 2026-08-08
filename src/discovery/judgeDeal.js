import { GoogleGenAI } from '@google/genai';
import { config } from '../config/index.js';

let client = null;
function getClient() {
  if (!config.gemini.apiKey) return null;
  if (!client) client = new GoogleGenAI({ apiKey: config.gemini.apiKey });
  return client;
}

// Se uma chamada falhar (sem crédito, rate limit, etc), não adianta tentar de
// novo pra cada oferta da mesma execução — só volta a tentar na próxima vez
// que o processo rodar.
let aiDisabledForThisRun = false;

const SYSTEM_PROMPT = `Você avalia ofertas antes de um bot anunciá-las num grupo de WhatsApp pra consumidores em geral no Brasil, hoje (${new Date().toLocaleDateString('pt-BR')}).

Aprove ofertas que sejam uma oportunidade real de compra pra maioria das pessoas. Considere:
- Categorias que vendem muito e o público gosta de pegar barato: roupas (calça, camisa, kit de camisas),
  tênis, celular, TV, notebook, eletrodoméstico, itens de casa, beleza, produtos de bebê, esporte, etc.
- Relevância do momento: se tem algo em alta (ex: época de Copa do Mundo, Black Friday, Natal, volta às aulas),
  produtos ligados a isso fazem MAIS sentido, não menos. Não rejeite por ser "colecionável" se for algo do
  momento que as pessoas realmente estão comprando.
- Se o produto parece ser vendido de verdade / ter saída (marca reconhecida, categoria popular, descrição
  normal) versus parecer nicho demais, obscuro, ou com desconto "de" claramente inflado só pra parecer
  promoção.

Rejeite só o que realmente não faz sentido anunciar pro público geral: produtos claramente de nicho muito
específico (peça industrial, insumo profissional), coisas com preço "de" visivelmente fabricado, ou itens que
pareçam sem qualquer apelo de compra.

Na dúvida, aprove — o objetivo é não perder boas ofertas, só filtrar o que é claramente ruim.

Responda só com JSON: {"approved": true|false, "reason": "motivo bem curto, em português"}`;

async function aiCheck({ title, store, currentPrice, originalPrice, discountPct }) {
  const gemini = getClient();
  if (!gemini || aiDisabledForThisRun) return null;

  const userPrompt = `Produto: ${title}
Loja: ${store}
Preço atual: R$ ${currentPrice}
Preço original: R$ ${originalPrice ?? 'desconhecido'}
Desconto: ${discountPct ?? '?'}%`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await Promise.race([
        gemini.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: userPrompt,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: 'application/json',
          },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout de 20s esperando o Gemini')), 20000)),
      ]);

      const text = response.text ?? '';
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}');

      if (typeof parsed.approved !== 'boolean') {
        throw new Error(`resposta sem campo "approved" válido: ${text}`);
      }

      return { approved: parsed.approved, reason: parsed.reason ?? '' };
    } catch (err) {
      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      console.warn(`Julgamento de IA indisponível (${err.message}) — passando direto pro resto desta execução.`);
      aiDisabledForThisRun = true;
      return null;
    }
  }
}

export async function judgeDeal({ title, store, currentPrice, originalPrice, discountPct }) {
  const aiResult = await aiCheck({ title, store, currentPrice, originalPrice, discountPct });
  if (aiResult) return aiResult;

  return { approved: true, reason: 'IA indisponível — passando direto' };
}
