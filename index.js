// BOT OnlyPriv - Atualizado com envio de QR Code como imagem + Copia e Cola

const { Telegraf } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

const ACCESS_TOKEN_MP = process.env.ACCESS_TOKEN_MP;
const CHANNEL_ID = process.env.CHANNEL_ID;

// Caminho da imagem de boas-vindas
const caminhoImagem = './imagem_inicial.jpeg';

const planos = {
  semanal: { descricao: 'Acesso Semanal 🔥', preco: 9.00, dias: 7 },
  mensal: { descricao: 'Acesso Mensal 🔥', preco: 14.99, dias: 30 },
  trimestral: { descricao: 'Acesso Trimestral 🔥', preco: 29.99, dias: 90 },
  vitalicio: { descricao: 'Acesso Vitalício 🔥', preco: 49.99, dias: 9999 }
};

const pagamentosPendentes = {};

// /start
bot.start(async (ctx) => {
  console.log(`Usuário ${ctx.from.username || ctx.from.id} iniciou o bot!`);

  await ctx.reply('Olá, seja bem-vindo ao @onlyyprivv_bot!');

  try {
    await ctx.replyWithPhoto({ source: caminhoImagem });
  } catch (error) {
    console.error('Erro ao enviar imagem:', error.message);
    await ctx.reply('⚠️ Imagem não encontrada. Siga normalmente!');
  }

  await ctx.reply(`Aqui você encontra milhares de vídeos exclusivos de OnlyFans, Privacy, Close Friends e Vazados, direto na palma da sua mão. 💦 

🌟 Descubra os benefícios do nosso VIP:

📂 Mais de 650 MIL mídias exclusivas e organizadas.
🍑 Conteúdos de 1.900 modelos.
🗓 Atualizações diárias – novidade todo dia!
⬇️ Baixe o que quiser, quando quiser.
🔎 Navegação fácil por hashtags e nomes.
👨‍💻 Suporte 24h para dúvidas e sugestões.
🎁 Promoções exclusivas para assinantes.

😈 Conteúdos extras liberados pra você após assinar:
Amadores, Xvideos Red, Pornhub Premium, Lives, Tufos inéditos!`);

  await ctx.reply('👉 Selecione o plano desejado, efetue o pagamento e receba o link de acesso em instantes.', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎆 PROMO Semanal por R$9,00', callback_data: 'plano_semanal' }],
        [{ text: '🎆 PROMO Mensal por R$14,99', callback_data: 'plano_mensal' }],
        [{ text: '🎆 PROMO Trimestral por R$29,99', callback_data: 'plano_trimestral' }],
        [{ text: '🎆 PROMO Vitalício por R$49,99', callback_data: 'plano_vitalicio' }]
      ]
    }
  });
});

// Quando clicarem num plano
bot.action(/plano_(.+)/, async (ctx) => {
  const tipoPlano = ctx.match[1];
  const plano = planos[tipoPlano];

  if (!plano) return ctx.reply('Plano inválido. Escolha uma opção correta.');

  try {
    const pagamento = await axios.post('https://api.mercadopago.com/v1/payments', {
      transaction_amount: plano.preco,
      description: plano.descricao,
      payment_method_id: 'pix',
      payer: { email: `${ctx.from.id}@gmail.com` }
    }, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN_MP}`,
        'X-Idempotency-Key': `${ctx.from.id}-${Date.now()}`
      }
    });

    const pix = pagamento.data.point_of_interaction.transaction_data;

    // Converter o base64 para Buffer
    const qrImageBuffer = Buffer.from(pix.qr_code_base64, 'base64');

    // 1. Enviar aviso de escanear QR
    await ctx.reply('📸 ESCANEIE O QR CODE ABAIXO PARA PAGAR:');

    // 2. Enviar imagem do QR Code
    await ctx.replyWithPhoto({ source: qrImageBuffer });

    // 3. Enviar o Copia e Cola Pix
    await ctx.reply(`💳 Ou copie e cole o código Pix abaixo:

\`${pix.qr_code}\`

Após o pagamento, aguarde a confirmação automática! 🚀`, {
      parse_mode: 'Markdown'
    });

    pagamentosPendentes[pagamento.data.id] = { userId: ctx.from.id, plano: tipoPlano };

  } catch (error) {
    console.error('Erro ao gerar pagamento:', error.response?.data || error);
    ctx.reply('Erro ao gerar o pagamento. Tente novamente em instantes.');
  }
});

// Função para verificar pagamentos
async function verificarPagamentos() {
  for (const pagamentoId in pagamentosPendentes) {
    try {
      const res = await axios.get(`https://api.mercadopago.com/v1/payments/${pagamentoId}`, {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN_MP}` }
      });

      if (res.data.status === 'approved') {
        const { userId, plano } = pagamentosPendentes[pagamentoId];
        delete pagamentosPendentes[pagamentoId];

        const dias = planos[plano].dias;

        await bot.telegram.sendMessage(userId, `✅ Pagamento confirmado! Bem-vindo ao VIP OnlyPriv!`);
        await bot.telegram.sendMessage(userId, `🔗 Aqui está seu acesso ao canal VIP: https://t.me/OnlyPriv`);

        if (dias < 9999) {
          setTimeout(async () => {
            try {
              await bot.telegram.kickChatMember(CHANNEL_ID, userId);
              await bot.telegram.unbanChatMember(CHANNEL_ID, userId);
            } catch (err) {
              console.error('Erro ao remover usuário após expiração:', err);
            }
          }, dias * 24 * 60 * 60 * 1000);
        }
      }

    } catch (err) {
      console.error('Erro ao verificar pagamento:', err.response?.data || err);
    }
  }
}

setInterval(verificarPagamentos, 60000);

// Inicia o bot
bot.launch();
console.log('🤖 Bot OnlyPriv está rodando e monitorando pagamentos!');
