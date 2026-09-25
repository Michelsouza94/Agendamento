const SUPABASE_URL = "https://ezxrcpnkdvnhugpdcjup.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8hZQrzNuLgy6jyZWgYY7cA_q0Njvqjg";

const { createClient } = await import(
  "https://esm.sh/@supabase/supabase-js@2"
);

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const backdrop = document.getElementById("modalBackdrop");
const receiptModal = document.getElementById("receiptModal");
const modalSubtitle = document.getElementById("modalSubtitle");
const form = document.getElementById("reservationForm");
const message = document.getElementById("formMessage");

let aulas = [];
let reservas = [];
let aulaSelecionada = null;
let dataSelecionada = null;

// --------------------------------------------------
// CARREGAR DADOS
// --------------------------------------------------

async function carregarDados() {
  const { data: aulasData, error: aulasError } = await supabase
    .from("aulas")
    .select("*")
    .eq("ativo", true)
    .order("data")
    .order("horario_inicio");

  if (aulasError) {
    console.error("Erro ao carregar aulas:", aulasError);
    mostrarErro("Não foi possível carregar os horários.");
    return;
  }

  const { data: reservasData, error: reservasError } = await supabase
    .from("reservas")
    .select("id, aula_id, nome, whatsapp, created_at");

  if (reservasError) {
    console.error("Erro ao carregar reservas:", reservasError);
    mostrarErro("Não foi possível carregar as reservas.");
    return;
  }

  aulas = aulasData || [];
  reservas = reservasData || [];

  if (!aulas.length) {
    mostrarErro("Nenhuma aula disponível no momento.");
    return;
  }

  dataSelecionada = aulas[0].data;

  renderizarDatas();
  renderizarHorarios();
}

// --------------------------------------------------
// DATAS
// --------------------------------------------------

function formatarData(data) {
  const partes = data.split("-");
  return new Date(
    Number(partes[0]),
    Number(partes[1]) - 1,
    Number(partes[2])
  );
}

function diaSemana(data) {
  return formatarData(data)
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "")
    .toUpperCase();
}

function diaNumero(data) {
  return formatarData(data).getDate();
}

function mesAbreviado(data) {
  return formatarData(data)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
}

function renderizarDatas() {
  const container = document.querySelector(".date-tabs");

  const datas = [...new Set(aulas.map(aula => aula.data))];

  container.innerHTML = datas
    .map(
      data => `
        <button
          class="date-tab ${data === dataSelecionada ? "active" : ""}"
          data-date="${data}"
        >
          <span>${diaSemana(data)}</span>
          <strong>${diaNumero(data)}</strong>
          <small>${mesAbreviado(data)}</small>
        </button>
      `
    )
    .join("");

  container.querySelectorAll(".date-tab").forEach(botao => {
    botao.addEventListener("click", () => {
      dataSelecionada = botao.dataset.date;

      container.querySelectorAll(".date-tab").forEach(item => {
        item.classList.remove("active");
      });

      botao.classList.add("active");

      renderizarHorarios();
    });
  });

  const primeiraData = datas[0];

  const dateCard = document.querySelector(".date-card");

  if (dateCard && primeiraData) {
    dateCard.innerHTML = `
      <span>Próximo dia</span>
      <strong>${diaSemana(primeiraData)}</strong>
      <b>${diaNumero(primeiraData)}</b>
      <small>${mesAbreviado(primeiraData)}</small>
    `;
  }
}

// --------------------------------------------------
// HORÁRIOS
// --------------------------------------------------

function horarioTexto(hora) {
  return hora.substring(0, 5);
}

function contarReservas(aulaId) {
  return reservas.filter(reserva => reserva.aula_id === aulaId).length;
}

function renderizarHorarios() {
  const lista = document.querySelector(".time-list");
  const disponibilidade = document.querySelector(".availability");

  const aulasDoDia = aulas.filter(
    aula => aula.data === dataSelecionada
  );

  const grupos = {};

  aulasDoDia.forEach(aula => {
    const chave = `${aula.horario_inicio}-${aula.horario_fim}`;

    if (!grupos[chave]) {
      grupos[chave] = {
        inicio: aula.horario_inicio,
        fim: aula.horario_fim,
        aulas: []
      };
    }

    grupos[chave].aulas.push(aula);
  });

  const horarios = Object.values(grupos);

  disponibilidade.textContent =
    `${horarios.length} ${horarios.length === 1 ? "horário" : "horários"}`;

  if (!horarios.length) {
    lista.innerHTML = `
      <div class="info-strip">
        <div class="info-icon">!</div>
        <div>
          <strong>Nenhum horário disponível</strong>
          <span>Escolha outra data.</span>
        </div>
      </div>
    `;
    return;
  }

  lista.innerHTML = horarios
    .map(grupo => {
      const totalCapacidade = grupo.aulas.reduce(
        (total, aula) => total + Number(aula.capacidade || 0),
        0
      );

      const totalReservado = grupo.aulas.reduce(
        (total, aula) => total + contarReservas(aula.id),
        0
      );

      const percentual =
        totalCapacidade > 0
          ? Math.min(
              100,
              Math.round((totalReservado / totalCapacidade) * 100)
            )
          : 0;

      const quantidadeTurmas = grupo.aulas.length;

      return `
        <article class="time-card">
          <div class="time-main">
            <div class="time-icon">${horarioTexto(grupo.inicio).substring(0, 2)}</div>

            <div>
              <strong>
                ${horarioTexto(grupo.inicio)} — ${horarioTexto(grupo.fim)}
              </strong>

              <span>
                ${quantidadeTurmas}
                ${quantidadeTurmas === 1 ? "turma disponível" : "turmas disponíveis"}
              </span>
            </div>
          </div>

          <div class="capacity">
            <div>
              <strong>${totalReservado}</strong>
              <span>/ ${totalCapacidade} vagas</span>
            </div>

            <div class="progress">
              <span style="width:${percentual}%"></span>
            </div>
          </div>

          <button
            class="details-btn"
            data-inicio="${grupo.inicio}"
            data-fim="${grupo.fim}"
          >
            Ver turmas
          </button>
        </article>
      `;
    })
    .join("");

  lista.querySelectorAll(".details-btn").forEach(botao => {
    botao.addEventListener("click", () => {
      abrirTurmas(botao.dataset.inicio, botao.dataset.fim);
    });
  });
}

// --------------------------------------------------
// TURMAS
// --------------------------------------------------

function abrirTurmas(inicio, fim) {
  const aulasDoHorario = aulas.filter(
    aula =>
      aula.data === dataSelecionada &&
      aula.horario_inicio === inicio &&
      aula.horario_fim === fim
  );

  modalSubtitle.textContent =
    `${formatarData(dataSelecionada).toLocaleDateString("pt-BR")} • ` +
    `${horarioTexto(inicio)} — ${horarioTexto(fim)}`;

  const opcoes = document.querySelector(".class-options");

  opcoes.innerHTML = aulasDoHorario
    .map(aula => {
      const reservasAula = contarReservas(aula.id);
      const vagasRestantes = Number(aula.capacidade) - reservasAula;

      return `
        <button
          class="class-option"
          data-aula-id="${aula.id}"
          ${vagasRestantes <= 0 ? "disabled" : ""}
        >
          <span>
            <strong>${aula.turma}</strong>
            <small>
              ${
                vagasRestantes > 0
                  ? `${vagasRestantes} vagas disponíveis`
                  : "Turma lotada"
              }
            </small>
          </span>
          <b>→</b>
        </button>
      `;
    })
    .join("");

  form.classList.add("hidden");
  message.textContent = "";

  opcoes.querySelectorAll(".class-option").forEach(botao => {
    botao.addEventListener("click", () => {
      aulaSelecionada = aulas.find(
        aula => aula.id === botao.dataset.aulaId
      );

      if (!aulaSelecionada) return;

      form.classList.remove("hidden");
      message.textContent = "";
    });
  });

  backdrop.classList.add("open");
}

// --------------------------------------------------
// RESERVAR
// --------------------------------------------------

document.getElementById("reserveBtn").addEventListener("click", async () => {
  const nome = document.getElementById("nameInput").value.trim();
  const whatsapp = document.getElementById("phoneInput").value.trim();

  if (!aulaSelecionada) {
    message.textContent = "Escolha uma turma.";
    return;
  }

  if (!nome || !whatsapp) {
    message.textContent = "Preencha seu nome e WhatsApp.";
    return;
  }

  const reservasAtuais = contarReservas(aulaSelecionada.id);

  if (reservasAtuais >= Number(aulaSelecionada.capacidade)) {
    message.textContent = "Essa turma acabou de ficar lotada.";
    return;
  }

  const botao = document.getElementById("reserveBtn");

  botao.disabled = true;
  botao.textContent = "Confirmando...";

  const { error } = await supabase
  .from("reservas")
  .insert([
    {
      aula_id: aulaSelecionada.id,
      nome: nome,
      whatsapp: whatsapp
    }
  ]);

  botao.disabled = false;
  botao.textContent = "Confirmar reserva";

  if (error) {
    console.error("Erro ao reservar:", error);
    message.textContent =
      "Não foi possível realizar a reserva. Tente novamente.";
    return;
  }

  reservas.push({
  aula_id: aulaSelecionada.id,
  nome: nome,
  whatsapp: whatsapp
});

  message.textContent =
    "Reserva confirmada! Seu horário foi reservado com sucesso.";

  document.getElementById("nameInput").value = "";
  document.getElementById("phoneInput").value = "";

  renderizarHorarios();
});

// --------------------------------------------------
// FECHAR MODAIS
// --------------------------------------------------

document.getElementById("closeModal").addEventListener("click", () => {
  backdrop.classList.remove("open");
});

backdrop.addEventListener("click", event => {
  if (event.target === backdrop) {
    backdrop.classList.remove("open");
  }
});

document.getElementById("receiptBtn").addEventListener("click", () => {
  receiptModal.classList.add("open");
});

document.getElementById("closeReceipt").addEventListener("click", () => {
  receiptModal.classList.remove("open");
});

// --------------------------------------------------
// COMPROVANTE
// --------------------------------------------------

document.getElementById("receiptSearch").addEventListener("click", async () => {
  const whatsapp = document
    .getElementById("receiptInput")
    .value
    .trim();

  const receiptMessage = document.getElementById("receiptMessage");

  if (!whatsapp) {
    receiptMessage.textContent = "Digite seu WhatsApp.";
    return;
  }

  const { data, error } = await supabase
    .from("reservas")
    .select(`
      id,
      nome,
      whatsapp,
      aulas (
        data,
        horario_inicio,
        horario_fim,
        turma
      )
    `)
    .eq("whatsapp", whatsapp)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao consultar reserva:", error);
    receiptMessage.textContent =
      "Não foi possível consultar agora.";
    return;
  }

  if (!data || !data.length) {
    receiptMessage.textContent =
      "Nenhuma reserva encontrada para esse WhatsApp.";
    return;
  }

  const reserva = data[0];

  const aula = reserva.aulas;

  receiptMessage.innerHTML = `
    <strong>Reserva encontrada!</strong><br>
    ${reserva.nome}<br>
    ${aula.turma}<br>
    ${formatarData(aula.data).toLocaleDateString("pt-BR")}<br>
    ${horarioTexto(aula.horario_inicio)} — ${horarioTexto(aula.horario_fim)}
  `;
});

// --------------------------------------------------
// ERRO
// --------------------------------------------------

function mostrarErro(texto) {
  const lista = document.querySelector(".time-list");

  if (lista) {
    lista.innerHTML = `
      <div class="info-strip">
        <div class="info-icon">!</div>
        <div>
          <strong>Ops!</strong>
          <span>${texto}</span>
        </div>
      </div>
    `;
  }
}

// --------------------------------------------------
// INICIAR
// --------------------------------------------------

carregarDados();
