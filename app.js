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
let reservasPorAula = {};
let listaEsperaPorAula = {};
let aulaSelecionada = null;
let ladoSelecionado = null;
let modoListaEspera = false;


// --------------------------------------------------
// ESTILOS NOVOS DA RESERVA
// --------------------------------------------------

function inserirEstilosReserva() {
  if (document.getElementById("estilosReservaLados")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "estilosReservaLados";

  style.textContent = `
    #reservaOcupacao {
      margin-bottom: 16px;
    }

    .reserva-ocupacao-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .reserva-ocupacao-title {
      margin: 0;
      color: #16365c;
      font: 800 18px/1.2 "DM Sans", Arial, sans-serif;
    }

    .reserva-ocupacao-total {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #71809a;
      font: 800 12px/1 "DM Sans", Arial, sans-serif;
      white-space: nowrap;
    }

    .reserva-lados {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .reserva-lado {
      appearance: none;
      width: 100%;
      border: 1px solid #dfe5eb;
      border-radius: 12px;
      background: #fffdf9;
      color: #16365c;
      padding: 12px;
      text-align: left;
      cursor: pointer;
      transition: .18s ease;
    }

    .reserva-lado:hover {
      border-color: #bfcbd7;
      transform: translateY(-1px);
    }

    .reserva-lado.selecionado {
      border-color: #24466d;
      box-shadow: 0 0 0 2px rgba(36, 70, 109, .10);
      background: #f7fafc;
    }

    .reserva-lado-titulo {
      font: 800 12px/1.2 "DM Sans", Arial, sans-serif;
      margin-bottom: 9px;
    }

    .reserva-lado-lista {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .reserva-pessoa,
    .reserva-vaga {
      min-height: 30px;
      padding: 7px 9px;
      border-radius: 8px;
      font: 700 12px/1.2 "DM Sans", Arial, sans-serif;
      display: flex;
      align-items: center;
    }

    .reserva-pessoa {
      background: #edf2f7;
      color: #24466d;
    }

    .reserva-vaga {
      background: #fafafa;
      color: #71809a;
      border: 1px dashed #dfe5eb;
      font-weight: 600;
    }

    .reserva-escolha-aviso {
      margin: 10px 0 0;
      color: #71809a;
      font: 600 11px/1.4 "DM Sans", Arial, sans-serif;
    }

    .reserva-lado-label {
      margin: 4px 0 9px;
      color: #16365c;
      font: 800 12px/1.2 "DM Sans", Arial, sans-serif;
    }

    .reserva-lado.indisponivel {
      opacity: .55;
      cursor: not-allowed;
      background: #f5f5f5;
    }

    .reserva-lado.indisponivel:hover {
      transform: none;
      border-color: #dfe5eb;
    }

    .reserva-lista-espera-box {
      margin-top: 14px;
      padding: 13px;
      border: 1px solid #ead9a7;
      border-radius: 11px;
      background: #fffaf0;
    }

    .reserva-lista-espera-box p {
      margin: 0 0 11px;
      color: #66521f;
      font: 600 11px/1.5 "DM Sans", Arial, sans-serif;
    }

    .reserva-lista-espera-box p strong {
      display: block;
      margin-bottom: 3px;
      color: #5b4616;
      font-weight: 800;
    }

    .reserva-lista-espera-concordancia {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      color: #16365c;
      font: 700 11px/1.35 "DM Sans", Arial, sans-serif;
      cursor: pointer;
    }

    .reserva-lista-espera-concordancia input {
      margin-top: 2px;
      flex: 0 0 auto;
      width: 15px;
      height: 15px;
    }

    @media (max-width: 620px) {
      .reserva-lados {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}


// --------------------------------------------------
// DATA DE HOJE
// --------------------------------------------------

function obterDataHoje() {
  const hoje = new Date();

  const ano = hoje.getFullYear();

  const mes = String(
    hoje.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    hoje.getDate()
  ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}


// --------------------------------------------------
// SEGURANÇA DO TEXTO EXIBIDO
// --------------------------------------------------

function escaparHtml(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// --------------------------------------------------
// CAPACIDADE POR LADO
// --------------------------------------------------

function capacidadeDoLado(
  capacidade,
  lado
) {
  const total =
    Number(capacidade) || 0;

  if (
    lado === "Esquerda"
  ) {
    return Math.ceil(
      total / 2
    );
  }

  return Math.floor(
    total / 2
  );
}


// --------------------------------------------------
// CARREGAR DADOS
// --------------------------------------------------

async function carregarDados() {
  const hoje =
    obterDataHoje();

  const {
    data: aulasData,
    error: aulasError
  } = await supabase
    .from("aulas")
    .select("*")
    .eq("ativo", true)
    .gte("data", hoje)
    .order("data")
    .order("horario_inicio");

  if (aulasError) {
    console.error(
      "Erro ao carregar aulas:",
      aulasError
    );

    mostrarErro(
      "Não foi possível carregar os horários."
    );

    return;
  }

  const {
    data: reservasData,
    error: reservasError
  } = await supabase.rpc(
    "contar_reservas_por_aula"
  );

  if (reservasError) {
    console.error(
      "Erro ao carregar reservas:",
      reservasError
    );

    mostrarErro(
      "Não foi possível carregar as reservas."
    );

    return;
  }

  const {
    data: listaEsperaData,
    error: listaEsperaError
  } = await supabase.rpc(
    "contar_lista_espera_por_aula"
  );

  if (listaEsperaError) {
    console.error(
      "Erro ao carregar lista de espera:",
      listaEsperaError
    );
  }

  aulas =
    aulasData || [];

  reservasPorAula = {};

  (
    reservasData || []
  ).forEach(
    item => {
      reservasPorAula[
        item.aula_id
      ] =
        Number(
          item.quantidade
        );
    }
  );

  listaEsperaPorAula = {};

  (
    listaEsperaData || []
  ).forEach(
    item => {
      listaEsperaPorAula[
        item.aula_id
      ] =
        Number(
          item.quantidade
        );
    }
  );

  if (
    !aulas.length
  ) {
    const disponibilidade =
      document.querySelector(
        ".availability"
      );

    if (
      disponibilidade
    ) {
      disponibilidade.textContent =
        "";
    }

    const dateCard =
      document.querySelector(
        ".date-card"
      );

    if (
      dateCard
    ) {
      dateCard.style.display =
        "none";
    }

    const lista =
      document.querySelector(
        ".time-list"
      );

    if (
      lista
    ) {
      lista.innerHTML = `
        <div class="info-strip">
          <div class="info-icon">
            !
          </div>

          <div>
            <strong>
              Nenhuma aula disponível
            </strong>

            <span>
              No momento não há aulas cadastradas.
            </span>
          </div>
        </div>
      `;
    }

    return;
  }

  const datasDisponiveis = [
    ...new Set(
      aulas.map(
        aula =>
          aula.data
      )
    )
  ];

  window.dataSelecionada =
    datasDisponiveis[0] ||
    null;

  renderizarDatas();

  renderizarHorarios();
}


// --------------------------------------------------
// DATAS
// --------------------------------------------------

function formatarData(
  data
) {
  const partes =
    String(data).split(
      "-"
    );

  return new Date(
    Number(
      partes[0]
    ),
    Number(
      partes[1]
    ) - 1,
    Number(
      partes[2]
    )
  );
}


function diaSemana(
  data
) {
  return formatarData(
    data
  )
    .toLocaleDateString(
      "pt-BR",
      {
        weekday: "short"
      }
    )
    .replace(
      ".",
      ""
    )
    .toUpperCase();
}


function diaNumero(
  data
) {
  return formatarData(
    data
  ).getDate();
}


function mesAbreviado(
  data
) {
  return formatarData(
    data
  )
    .toLocaleDateString(
      "pt-BR",
      {
        month: "short"
      }
    )
    .replace(
      ".",
      ""
    )
    .toUpperCase();
}


function renderizarDatas() {
  const container =
    document.querySelector(
      ".date-tabs"
    );

  if (
    !container
  ) {
    return;
  }

  const datas = [
    ...new Set(
      aulas.map(
        aula =>
          aula.data
      )
    )
  ];

  container.innerHTML =
    datas
      .map(
        data => `
          <button
            class="date-tab ${
              data ===
              window.dataSelecionada
                ? "active"
                : ""
            }"
            data-date="${data}"
            type="button"
          >

            <span>
              ${diaSemana(data)}
            </span>

            <strong>
              ${diaNumero(data)}
            </strong>

            <small>
              ${mesAbreviado(data)}
            </small>

          </button>
        `
      )
      .join("");

  container
    .querySelectorAll(
      ".date-tab"
    )
    .forEach(
      botao => {

        botao.addEventListener(
          "click",
          () => {

            window.dataSelecionada =
              botao.dataset.date;

            container
              .querySelectorAll(
                ".date-tab"
              )
              .forEach(
                item => {

                  item.classList.remove(
                    "active"
                  );

                }
              );

            botao.classList.add(
              "active"
            );

            renderizarHorarios();

          }
        );

      }
    );

  const dateCard =
    document.querySelector(
      ".date-card"
    );

  const primeiraData =
    datas[0];

  if (
    dateCard &&
    primeiraData
  ) {
    dateCard.style.display =
      "none";
  }
}


// --------------------------------------------------
// UTILITÁRIOS
// --------------------------------------------------

function horarioTexto(
  hora
) {
  return String(
    hora || ""
  ).substring(
    0,
    5
  );
}


function contarReservas(
  aulaId
) {
  return (
    reservasPorAula[
      aulaId
    ] || 0
  );
}


function contarListaEspera(
  aulaId
) {
  return (
    listaEsperaPorAula[
      aulaId
    ] || 0
  );
}


function atualizarBotaoReserva() {

  const botao =
    document.getElementById(
      "reserveBtn"
    );

  if (
    !botao ||
    !aulaSelecionada
  ) {
    return;
  }

  if (
    !ladoSelecionado
  ) {

    modoListaEspera =
      false;

    botao.disabled =
      true;

    botao.textContent =
      "Escolha um lado";

    return;
  }

  const ladoBotao =
    document.querySelector(
      `.reserva-lado[data-lado="${ladoSelecionado}"]`
    );

  if (
    !ladoBotao
  ) {
    return;
  }

  const quantidade =
    Number(
      ladoBotao.dataset.quantidade ||
      0
    );

  const capacidade =
    Number(
      ladoBotao.dataset.capacidade ||
      0
    );

  if (
    capacidade <= 0
  ) {

    modoListaEspera =
      false;

    botao.disabled =
      true;

    botao.textContent =
      "Lado indisponível";

    return;
  }

  modoListaEspera =
    quantidade >= capacidade;

  if (
    modoListaEspera
  ) {

    const aceite =
      document.getElementById(
        "aceiteListaEspera"
      )?.checked === true;

    botao.disabled =
      !aceite;

    botao.textContent =
      "Entrar na lista de espera";

    return;
  }

  botao.disabled =
    false;

  botao.textContent =
    "Confirmar reserva";
}


// --------------------------------------------------
// OCUPAÇÃO DA TURMA
// --------------------------------------------------

async function carregarNomesReservasDaAula(
  aulaId
) {
  const {
    data,
    error
  } = await supabase.rpc(
    "consultar_nomes_reservas_por_aula",
    {
      p_aula_id:
        aulaId
    }
  );

  if (
    error
  ) {
    console.error(
      "Erro ao consultar reservas da turma:",
      error
    );

    return [];
  }

  return data || [];
}


function montarPainelLado(
  lado,
  reservasDoLado,
  capacidade
) {

  const quantidade =
    reservasDoLado.length;

  const lotado =
    capacidade > 0 &&
    quantidade >= capacidade;

  const indisponivel =
    capacidade <= 0;

  const nomes =
    reservasDoLado
      .map(
        item =>
          String(
            item.nome || ""
          ).trim()
      )
      .filter(Boolean);

  const vagas =
    Math.max(
      0,
      capacidade -
        quantidade
    );

  const pessoasHtml =
    nomes
      .map(
        nome => `
          <div class="reserva-pessoa">
            ${escaparHtml(nome)}
          </div>
        `
      )
      .join("");

  const vagasHtml =
    Array.from(
      {
        length: vagas
      },
      () => `
        <div class="reserva-vaga">
          vaga livre
        </div>
      `
    )
    .join("");

  let titulo;

  if (
    lotado
  ) {

    titulo =
      `${lado} (${quantidade}/${capacidade} — lista de espera)`;

  } else if (
    indisponivel
  ) {

    titulo =
      `${lado} (${quantidade}/${capacidade} — indisponível)`;

  } else {

    titulo =
      `${lado} (${quantidade}/${capacidade})`;

  }

  return `
    <button
      type="button"
      class="
        reserva-lado
        ${
          ladoSelecionado === lado
            ? "selecionado"
            : ""
        }
        ${
          indisponivel
            ? "indisponivel"
            : ""
        }
      "
      data-lado="${lado}"
      data-quantidade="${quantidade}"
      data-capacidade="${capacidade}"
      ${
        indisponivel
          ? "disabled"
          : ""
      }
    >

      <div class="reserva-lado-titulo">
        ${escaparHtml(titulo)}
      </div>

      <div class="reserva-lado-lista">
        ${pessoasHtml}
        ${vagasHtml}
      </div>

    </button>
  `;
}


function criarOuObterOcupacao() {
  if (
    !form
  ) {
    return null;
  }

  let ocupacao =
    document.getElementById(
      "reservaOcupacao"
    );

  if (
    !ocupacao
  ) {
    ocupacao =
      document.createElement(
        "div"
      );

    ocupacao.id =
      "reservaOcupacao";

    form.insertBefore(
      ocupacao,
      form.firstChild
    );
  }

  return ocupacao;
}


async function atualizarOcupacaoReserva() {

  if (
    !aulaSelecionada
  ) {
    return;
  }

  const ocupacao =
    criarOuObterOcupacao();

  if (
    !ocupacao
  ) {
    return;
  }

  ocupacao.innerHTML = `
    <div class="reserva-ocupacao-header">

      <h3
        class="reserva-ocupacao-title"
      >
        ${escaparHtml(
          aulaSelecionada.turma
        )}
      </h3>

      <span
        class="reserva-ocupacao-total"
      >

        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >

          <path
            d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            stroke="currentColor"
            stroke-width="1.7"
          />

          <path
            d="M15.5 10a2.5 2.5 0 1 0 0-5"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />

          <path
            d="M4 19c0-3 2.2-5 5-5s5 2 5 5"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />

          <path
            d="M15 14.5c2.6.2 4.5 1.8 4.8 4.5"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />

        </svg>

        ${contarReservas(
          aulaSelecionada.id
        )}/${Number(
          aulaSelecionada.capacidade
        )}

      </span>

    </div>

    <div
      class="reserva-lado-label"
    >
      Lado da quadra
    </div>

    <div
      class="reserva-lados"
    >
      <div
        class="reserva-carregando"
      >
        Carregando...
      </div>
    </div>
  `;

  const reservas =
    await carregarNomesReservasDaAula(
      aulaSelecionada.id
    );

  const esquerda =
    reservas.filter(
      item =>
        item.lado ===
        "Esquerda"
    );

  const direita =
    reservas.filter(
      item =>
        item.lado ===
        "Direita"
    );

  const capacidadeEsquerda =
    capacidadeDoLado(
      aulaSelecionada.capacidade,
      "Esquerda"
    );

  const capacidadeDireita =
    capacidadeDoLado(
      aulaSelecionada.capacidade,
      "Direita"
    );

  const lados =
    ocupacao.querySelector(
      ".reserva-lados"
    );

  lados.innerHTML =
    montarPainelLado(
      "Esquerda",
      esquerda,
      capacidadeEsquerda
    ) +
    montarPainelLado(
      "Direita",
      direita,
      capacidadeDireita
    );

  lados
    .querySelectorAll(
      ".reserva-lado"
    )
    .forEach(
      botao => {

        if (
          botao.disabled
        ) {
          return;
        }

        botao.addEventListener(
          "click",
          () => {

            ladoSelecionado =
              botao.dataset.lado;

            lados
              .querySelectorAll(
                ".reserva-lado"
              )
              .forEach(
                item => {

                  item.classList.remove(
                    "selecionado"
                  );

                }
              );

            botao.classList.add(
              "selecionado"
            );

            atualizarTermoListaEspera();

            atualizarBotaoReserva();

          }
        );

      }
    );

  atualizarTermoListaEspera();

  atualizarBotaoReserva();
}


function atualizarTermoListaEspera() {

  const ocupacao =
    document.getElementById(
      "reservaOcupacao"
    );

  if (
    !ocupacao
  ) {
    return;
  }

  const ladoBotao =
    ladoSelecionado
      ? ocupacao.querySelector(
          `.reserva-lado[data-lado="${ladoSelecionado}"]`
        )
      : null;

  const quantidade =
    Number(
      ladoBotao?.dataset.quantidade ||
      0
    );

  const capacidade =
    Number(
      ladoBotao?.dataset.capacidade ||
      0
    );

  const lotado =
    capacidade > 0 &&
    quantidade >= capacidade;

  const existente =
    document.getElementById(
      "reservaListaEsperaBox"
    );

  if (
    existente
  ) {
    existente.remove();
  }

  if (
    !lotado
  ) {
    return;
  }

  const box =
    document.createElement(
      "div"
    );

  box.id =
    "reservaListaEsperaBox";

  box.className =
    "reserva-lista-espera-box";

  box.innerHTML = `
    <p>
      <strong>
        A lista dessa aula já está trancada.
      </strong>

      Ao se inscrever agora você não poderá mais cancelar
      e se compromete a participar, mediante pagamento,
      mesmo em caso de ausência.
    </p>

    <label
      class="reserva-lista-espera-concordancia"
    >

      <input
        type="checkbox"
        id="aceiteListaEspera"
      >

      <span>
        Estou ciente e concordo
      </span>

    </label>
  `;

  ocupacao.appendChild(
    box
  );

  document
    .getElementById(
      "aceiteListaEspera"
    )
    ?.addEventListener(
      "change",
      () => {

        atualizarBotaoReserva();

      }
    );
}


// --------------------------------------------------
// ABRIR RESERVA
// --------------------------------------------------

async function abrirReservaDaAula(
  aulaId
) {
  aulaSelecionada =
    aulas.find(
      aula =>
        aula.id ===
        aulaId
    ) || null;

  if (
    !aulaSelecionada
  ) {
    return;
  }

  ladoSelecionado =
    null;

  modoListaEspera =
    false;

  if (
    modalSubtitle
  ) {
    modalSubtitle.textContent =
      `${formatarData(
        aulaSelecionada.data
      ).toLocaleDateString(
        "pt-BR"
      )} • ` +
      `${horarioTexto(
        aulaSelecionada.horario_inicio
      )} — ` +
      `${horarioTexto(
        aulaSelecionada.horario_fim
      )}`;
  }

  if (
    form
  ) {
    form.classList.remove(
      "hidden"
    );
  }

  if (
    message
  ) {
    message.textContent =
      "";
  }

  const nameInput =
    document.getElementById(
      "nameInput"
    );

  const phoneInput =
    document.getElementById(
      "phoneInput"
    );

  if (
    nameInput
  ) {
    nameInput.value =
      "";
  }

  if (
    phoneInput
  ) {
    phoneInput.value =
      "";
  }

  if (
    backdrop
  ) {
    backdrop.classList.add(
      "open"
    );
  }

  const botaoReserva =
    document.getElementById(
      "reserveBtn"
    );

  if (
    botaoReserva
  ) {
    botaoReserva.disabled =
      true;

    botaoReserva.textContent =
      "Escolha um lado";
  }

  await atualizarOcupacaoReserva();
}


// --------------------------------------------------
// RENDERIZAR HORÁRIOS
// --------------------------------------------------

function renderizarHorarios() {
  const lista =
    document.querySelector(
      ".time-list"
    );

  const disponibilidade =
    document.querySelector(
      ".availability"
    );

  if (
    !lista
  ) {
    return;
  }

  const aulasDoDia =
    aulas.filter(
      aula =>
        aula.data ===
        window.dataSelecionada
    );

  const grupos =
    {};

  aulasDoDia.forEach(
    aula => {

      const chave =
        `${aula.horario_inicio}-${aula.horario_fim}`;

      if (
        !grupos[chave]
      ) {
        grupos[chave] = {
          inicio:
            aula.horario_inicio,

          fim:
            aula.horario_fim,

          aulas:
            []
        };
      }

      grupos[
        chave
      ]
        .aulas
        .push(
          aula
        );

    }
  );

  const horarios =
    Object.values(
      grupos
    );

  if (
    disponibilidade
  ) {
    disponibilidade.textContent =
      `${horarios.length} ${
        horarios.length ===
        1
          ? "horário"
          : "horários"
      }`;
  }

  if (
    !horarios.length
  ) {
    lista.innerHTML = `
      <div
        class="info-strip"
      >

        <div
          class="info-icon"
        >
          !
        </div>

        <div>
          <strong>
            Nenhum horário disponível
          </strong>

          <span>
            Escolha outra data.
          </span>
        </div>

      </div>
    `;

    return;
  }

  lista.innerHTML =
    horarios
      .map(
        grupo => {

          const totalCapacidade =
            grupo.aulas.reduce(
              (
                total,
                aula
              ) =>
                total +
                Number(
                  aula.capacidade ||
                    0
                ),
              0
            );

          const totalReservado =
            grupo.aulas.reduce(
              (
                total,
                aula
              ) =>
                total +
                contarReservas(
                  aula.id
                ),
              0
            );

          const totalNaLista =
            grupo.aulas.reduce(
              (
                total,
                aula
              ) =>
                total +
                contarListaEspera(
                  aula.id
                ),
              0
            );

          const percentual =
            totalCapacidade >
            0
              ? Math.min(
                  100,
                  Math.round(
                    (
                      totalReservado /
                      totalCapacidade
                    ) *
                    100
                  )
                )
              : 0;

          const quantidadeTurmas =
            grupo.aulas.length;

          return `
            <article
              class="time-card"
            >

              <div
                class="time-main"
              >

                <div
                  class="time-icon"
                >
                  ${horarioTexto(
                    grupo.inicio
                  ).substring(
                    0,
                    2
                  )}
                </div>

                <div>

                  <strong>
                    ${horarioTexto(
                      grupo.inicio
                    )}

                    —

                    ${horarioTexto(
                      grupo.fim
                    )}
                  </strong>

                  <span>
                    ${quantidadeTurmas}

                    ${
                      quantidadeTurmas ===
                      1
                        ? "turma disponível"
                        : "turmas disponíveis"
                    }
                  </span>

                </div>

              </div>


              <div
                class="capacity"
              >

                <div>

                  <strong>
                    ${totalReservado}
                  </strong>

                  <span>
                    /
                    ${totalCapacidade}
                    vagas
                  </span>

                </div>


                ${
                  totalNaLista >
                  0
                    ? `
                      <small>
                        ${totalNaLista}

                        ${
                          totalNaLista ===
                          1
                            ? "pessoa"
                            : "pessoas"
                        }

                        na lista de espera
                      </small>
                    `
                    : ""
                }


                <div
                  class="progress"
                >

                  <span
                    style="
                      width:${percentual}%
                    "
                  ></span>

                </div>

              </div>


              <div
                class="class-grid"
              >

                ${grupo.aulas
                  .map(
                    aula => {

                      const reservasAula =
                        contarReservas(
                          aula.id
                        );

                      const pessoasNaEspera =
                        contarListaEspera(
                          aula.id
                        );

                      const lotada =
                        reservasAula >=
                        Number(
                          aula.capacidade
                        );

                      return `
                        <button
                          type="button"
                          class="inline-class-option"
                          data-aula-id="${aula.id}"
                          ${
                            lotada
                              ? 'data-lista-espera="true"'
                              : ""
                          }
                        >

                          <span>

                            <strong>
                              ${escaparHtml(
                                aula.turma
                              )}
                            </strong>

                          </span>


                          <span
                            class="class-meta"
                          >

                            ${
                              pessoasNaEspera >
                              0
                                ? `
                                  <span
                                    class="wait-badge"
                                    data-wait-aula-id="${aula.id}"
                                    role="button"
                                    tabindex="0"
                                  >
                                    ${pessoasNaEspera}
                                    na espera
                                  </span>
                                `
                                : ""
                            }


                            <small>
                              ${reservasAula}/${Number(
                                aula.capacidade
                              )}
                            </small>


                            <b>
                              ›
                            </b>

                          </span>

                        </button>
                      `;

                    }
                  )
                  .join("")}

              </div>

            </article>
          `;
        }
      )
      .join("");

  lista
    .querySelectorAll(
      ".inline-class-option"
    )
    .forEach(
      botao => {

        botao.addEventListener(
          "click",
          () => {

            abrirReservaDaAula(
              botao.dataset.aulaId
            );

          }
        );

      }
    );

  lista
    .querySelectorAll(
      ".wait-badge"
    )
    .forEach(
      badge => {

        badge.addEventListener(
          "click",
          event => {

            event.preventDefault();

            event.stopPropagation();

            mostrarListaEspera(
              badge.dataset.waitAulaId
            );

          }
        );

        badge.addEventListener(
          "keydown",
          event => {

            if (
              event.key ===
                "Enter" ||
              event.key ===
                " "
            ) {

              event.preventDefault();

              event.stopPropagation();

              mostrarListaEspera(
                badge.dataset.waitAulaId
              );

            }

          }
        );

      }
    );
}


// --------------------------------------------------
// LISTA DE ESPERA - NOMES
// --------------------------------------------------

async function mostrarListaEspera(
  aulaId
) {
  const {
    data,
    error
  } = await supabase.rpc(
    "consultar_nomes_lista_espera_por_aula",
    {
      p_aula_id:
        aulaId
    }
  );

  if (
    error
  ) {
    console.error(
      "Erro ao consultar lista de espera:",
      error
    );

    return;
  }

  const nomes =
    (
      data || []
    )
      .map(
        item =>
          item.nome
      )
      .filter(Boolean);

  if (
    !nomes.length
  ) {
    return;
  }

  const overlay =
    document.createElement(
      "div"
    );

  overlay.style.position =
    "fixed";

  overlay.style.inset =
    "0";

  overlay.style.background =
    "rgba(22, 54, 92, .38)";

  overlay.style.display =
    "flex";

  overlay.style.alignItems =
    "center";

  overlay.style.justifyContent =
    "center";

  overlay.style.padding =
    "20px";

  overlay.style.zIndex =
    "9999";


  const modal =
    document.createElement(
      "div"
    );

  modal.style.position =
    "relative";

  modal.style.width =
    "min(420px, 100%)";

  modal.style.background =
    "#fffdf9";

  modal.style.border =
    "1px solid #dfe5eb";

  modal.style.borderRadius =
    "16px";

  modal.style.boxShadow =
    "0 18px 50px rgba(22, 54, 92, .18)";

  modal.style.padding =
    "24px";


  const fecharX =
    document.createElement(
      "button"
    );

  fecharX.type =
    "button";

  fecharX.textContent =
    "×";

  fecharX.style.position =
    "absolute";

  fecharX.style.top =
    "10px";

  fecharX.style.right =
    "12px";

  fecharX.style.border =
    "0";

  fecharX.style.background =
    "transparent";

  fecharX.style.color =
    "#71809a";

  fecharX.style.fontSize =
    "28px";

  fecharX.style.lineHeight =
    "1";

  fecharX.style.cursor =
    "pointer";

  fecharX.addEventListener(
    "click",
    () =>
      overlay.remove()
  );


  const titulo =
    document.createElement(
      "h3"
    );

  titulo.textContent =
    "Lista de espera";

  titulo.style.margin =
    "0 30px 16px 0";

  titulo.style.color =
    "#16365c";

  titulo.style.font =
    '800 20px/1.2 "DM Sans", Arial, sans-serif';


  const lista =
    document.createElement(
      "div"
    );

  lista.style.display =
    "flex";

  lista.style.flexDirection =
    "column";

  lista.style.gap =
    "8px";


  nomes.forEach(
    nome => {

      const item =
        document.createElement(
          "div"
        );

      item.style.display =
        "flex";

      item.style.alignItems =
        "center";

      item.style.padding =
        "11px 13px";

      item.style.border =
        "1px solid #dfe5eb";

      item.style.borderRadius =
        "10px";

      item.style.background =
        "#fff";

      item.style.color =
        "#16365c";

      item.style.font =
        '700 14px/1.2 "DM Sans", Arial, sans-serif';

      const registro =
        (data || []).find(
          itemData =>
            itemData.nome ===
            nome
        );

      const lado =
        registro?.lado ||
        "Lado não informado";

      item.textContent =
        `• ${nome} — ${lado}`;

      lista.appendChild(
        item
      );

    }
  );


  const fechar =
    document.createElement(
      "button"
    );

  fechar.type =
    "button";

  fechar.textContent =
    "Fechar";

  fechar.style.width =
    "100%";

  fechar.style.marginTop =
    "18px";

  fechar.style.border =
    "0";

  fechar.style.borderRadius =
    "10px";

  fechar.style.padding =
    "11px 14px";

  fechar.style.background =
    "#24466d";

  fechar.style.color =
    "#fff";

  fechar.style.font =
    '700 14px "DM Sans", Arial, sans-serif';

  fechar.style.cursor =
    "pointer";

  fechar.addEventListener(
    "click",
    () =>
      overlay.remove()
  );


  modal.appendChild(
    fecharX
  );

  modal.appendChild(
    titulo
  );

  modal.appendChild(
    lista
  );

  modal.appendChild(
    fechar
  );

  overlay.appendChild(
    modal
  );

  document.body.appendChild(
    overlay
  );


  overlay.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        overlay
      ) {

        overlay.remove();

      }

    }
  );
}


// --------------------------------------------------
// RESERVAR / LISTA DE ESPERA
// --------------------------------------------------

document
  .getElementById(
    "reserveBtn"
  )
  ?.addEventListener(
    "click",
    async () => {

      const nome =
        document.getElementById(
          "nameInput"
        )?.value.trim() ||
        "";

      const whatsapp =
        document.getElementById(
          "phoneInput"
        )?.value.trim() ||
        "";

      if (
        !aulaSelecionada
      ) {

        message.textContent =
          "Escolha uma turma.";

        return;
      }

      if (
        !ladoSelecionado
      ) {

        message.textContent =
          "Escolha Esquerda ou Direita.";

        return;
      }

      if (
        modoListaEspera
      ) {

        const aceite =
          document.getElementById(
            "aceiteListaEspera"
          )?.checked === true;

        if (!aceite) {

          message.textContent =
            "Confirme que está ciente e concorda para entrar na lista de espera.";

          return;
        }
      }

      if (
        !nome ||
        !whatsapp
      ) {

        message.textContent =
          "Preencha seu nome e WhatsApp.";

        return;
      }

      const botao =
        document.getElementById(
          "reserveBtn"
        );

      const textoOriginal =
        botao.textContent;

      botao.disabled =
        true;

      botao.textContent =
        "Confirmando...";

      const rpcNome =
        modoListaEspera
          ? "entrar_lista_espera_com_lado"
          : "reservar_aula_com_lado";

      const {
        data,
        error
      } = await supabase.rpc(
        rpcNome,
        {
          p_aula_id:
            aulaSelecionada.id,

          p_nome:
            nome,

          p_whatsapp:
            whatsapp,

          p_lado:
            ladoSelecionado
        }
      );

      botao.disabled =
        false;

      botao.textContent =
        textoOriginal;

      if (
        error
      ) {

        console.error(
          "Erro:",
          error
        );

        message.textContent =
          "Não foi possível concluir. Tente novamente.";

        return;
      }

      const resultado =
        data?.[0];

      if (
        !resultado?.sucesso
      ) {

        message.textContent =
          resultado?.mensagem ||
          "Não foi possível concluir.";

        await atualizarOcupacaoReserva();

        return;
      }

      if (
        modoListaEspera
      ) {

        listaEsperaPorAula[
          aulaSelecionada.id
        ] =
          (
            listaEsperaPorAula[
              aulaSelecionada.id
            ] || 0
          ) + 1;

        message.textContent =
          `Você entrou na lista de espera da ${ladoSelecionado}.`;

      } else {

        reservasPorAula[
          aulaSelecionada.id
        ] =
          (
            reservasPorAula[
              aulaSelecionada.id
            ] || 0
          ) + 1;

        message.textContent =
          "Reserva confirmada! Seu horário foi reservado com sucesso.";

      }

      const nameInput =
        document.getElementById(
          "nameInput"
        );

      const phoneInput =
        document.getElementById(
          "phoneInput"
        );

      if (
        nameInput
      ) {
        nameInput.value =
          "";
      }

      if (
        phoneInput
      ) {
        phoneInput.value =
          "";
      }

      await atualizarOcupacaoReserva();

      renderizarHorarios();

    }
  );


// --------------------------------------------------
// FECHAR MODAIS
// --------------------------------------------------

document
  .getElementById(
    "closeModal"
  )
  ?.addEventListener(
    "click",
    () => {

      if (
        backdrop
      ) {

        backdrop.classList.remove(
          "open"
        );

      }

    }
  );


if (
  backdrop
) {

  backdrop.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        backdrop
      ) {

        backdrop.classList.remove(
          "open"
        );

      }

    }
  );

}


document
  .getElementById(
    "receiptBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      if (
        receiptModal
      ) {

        receiptModal.classList.add(
          "open"
        );

      }

    }
  );


document
  .getElementById(
    "closeReceipt"
  )
  ?.addEventListener(
    "click",
    () => {

      if (
        receiptModal
      ) {

        receiptModal.classList.remove(
          "open"
        );

      }

    }
  );


// --------------------------------------------------
// COMPROVANTE
// --------------------------------------------------

document
  .getElementById(
    "receiptSearch"
  )
  ?.addEventListener(
    "click",
    async () => {

      const whatsapp =
        document.getElementById(
          "receiptInput"
        )?.value.trim() ||
        "";

      const receiptMessage =
        document.getElementById(
          "receiptMessage"
        );

      if (
        !receiptMessage
      ) {
        return;
      }

      if (
        !whatsapp
      ) {

        receiptMessage.textContent =
          "Digite seu WhatsApp.";

        return;
      }

      receiptMessage.textContent =
        "Consultando...";

      const {
        data,
        error
      } =
        await supabase.rpc(
          "consultar_reserva_por_whatsapp",
          {
            p_whatsapp:
              whatsapp
          }
        );

      if (
        error
      ) {

        console.error(
          "Erro ao consultar reserva:",
          error
        );

        receiptMessage.textContent =
          "Não foi possível consultar agora.";

        return;
      }

      if (
        data &&
        data.length
      ) {

        const reserva =
          data[0];

        receiptMessage.innerHTML = `
          <strong>
            Reserva encontrada!
          </strong>

          <br>

          ${escaparHtml(
            reserva.nome
          )}

          <br>

          ${escaparHtml(
            reserva.turma
          )}

          <br>

          ${formatarData(
            reserva.data
          ).toLocaleDateString(
            "pt-BR"
          )}

          <br>

          ${horarioTexto(
            reserva.horario_inicio
          )}
          —
          ${horarioTexto(
            reserva.horario_fim
          )}

          <br>

          ${escaparHtml(
            reserva.lado ||
              "Lado não informado"
          )}
        `;

        return;
      }

      const {
        data:
          listaEsperaData,
        error:
          listaEsperaError
      } =
        await supabase.rpc(
          "consultar_lista_espera_por_whatsapp",
          {
            p_whatsapp:
              whatsapp
          }
        );

      if (
        listaEsperaError
      ) {

        console.error(
          "Erro ao consultar lista de espera:",
          listaEsperaError
        );

        receiptMessage.textContent =
          "Não foi possível consultar agora.";

        return;
      }

      if (
        !listaEsperaData ||
        !listaEsperaData.length
      ) {

        receiptMessage.textContent =
          "Nenhuma reserva ou entrada na lista de espera encontrada para esse WhatsApp.";

        return;
      }

      const espera =
        listaEsperaData[0];

      receiptMessage.innerHTML = `
        <strong>
          Entrada na lista de espera encontrada!
        </strong>

        <br>

        ${escaparHtml(
          espera.nome
        )}

        <br>

        ${escaparHtml(
          espera.turma
        )}

        <br>

        ${formatarData(
          espera.data
        ).toLocaleDateString(
          "pt-BR"
        )}

        <br>

        ${horarioTexto(
          espera.horario_inicio
        )}
        —
        ${horarioTexto(
          espera.horario_fim
        )}

        <br>

        ${escaparHtml(
          espera.lado ||
            "Lado não informado"
        )}
      `;

    }
  );


// --------------------------------------------------
// ERRO
// --------------------------------------------------

function mostrarErro(
  texto
) {

  const lista =
    document.querySelector(
      ".time-list"
    );

  if (
    !lista
  ) {
    return;
  }

  lista.innerHTML = `
    <div
      class="info-strip"
    >

      <div
        class="info-icon"
      >
        !
      </div>

      <div>

        <strong>
          Ops!
        </strong>

        <span>
          ${escaparHtml(
            texto
          )}
        </span>

      </div>

    </div>
  `;
}


// --------------------------------------------------
// INICIAR
// --------------------------------------------------

inserirEstilosReserva();

carregarDados();
