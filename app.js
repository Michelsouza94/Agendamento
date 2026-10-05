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
let dataSelecionada = null;
let modoListaEspera = false;


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
// CARREGAR DADOS
// --------------------------------------------------

async function carregarDados() {
  const hoje = obterDataHoje();

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

  aulas = aulasData || [];

  reservasPorAula = {};

  (reservasData || []).forEach(item => {
    reservasPorAula[item.aula_id] =
      Number(item.quantidade);
  });

  listaEsperaPorAula = {};

  (listaEsperaData || []).forEach(item => {
    listaEsperaPorAula[item.aula_id] =
      Number(item.quantidade);
  });

  if (!aulas.length) {
    dataSelecionada = null;

    const disponibilidade =
      document.querySelector(
        ".availability"
      );

    if (disponibilidade) {
      disponibilidade.textContent = "";
    }

    const dateCard =
      document.querySelector(
        ".date-card"
      );

    if (dateCard) {
      dateCard.style.display = "none";
    }

    const lista =
      document.querySelector(
        ".time-list"
      );

    if (lista) {
      lista.innerHTML = `
        <div class="info-strip">
          <div class="info-icon">!</div>

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
        aula => aula.data
      )
    )
  ];

  dataSelecionada =
    datasDisponiveis[0] || null;

  renderizarDatas();

  renderizarHorarios();
}


// --------------------------------------------------
// DATAS
// --------------------------------------------------

function formatarData(data) {
  const partes =
    data.split("-");

  return new Date(
    Number(partes[0]),
    Number(partes[1]) - 1,
    Number(partes[2])
  );
}


function diaSemana(data) {
  return formatarData(data)
    .toLocaleDateString(
      "pt-BR",
      {
        weekday: "short"
      }
    )
    .replace(".", "")
    .toUpperCase();
}


function diaNumero(data) {
  return formatarData(data)
    .getDate();
}


function mesAbreviado(data) {
  return formatarData(data)
    .toLocaleDateString(
      "pt-BR",
      {
        month: "short"
      }
    )
    .replace(".", "")
    .toUpperCase();
}


function renderizarDatas() {
  const container =
    document.querySelector(
      ".date-tabs"
    );

  if (!container) {
    return;
  }

  const datas = [
    ...new Set(
      aulas.map(
        aula => aula.data
      )
    )
  ];

  container.innerHTML =
    datas
      .map(
        data => `
          <button
            class="date-tab ${
              data === dataSelecionada
                ? "active"
                : ""
            }"
            data-date="${data}"
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
    .forEach(botao => {
      botao.addEventListener(
        "click",
        () => {

          dataSelecionada =
            botao.dataset.date;

          container
            .querySelectorAll(
              ".date-tab"
            )
            .forEach(item => {
              item.classList.remove(
                "active"
              );
            });

          botao.classList.add(
            "active"
          );

          renderizarHorarios();
        }
      );
    });

  const primeiraData =
    datas[0];

  const dateCard =
    document.querySelector(
      ".date-card"
    );

  if (
    dateCard &&
    primeiraData
  ) {
    dateCard.style.display =
      "none";

    dateCard.innerHTML = `
      <span>
        Próximo dia
      </span>

      <strong>
        ${diaSemana(primeiraData)}
      </strong>

      <b>
        ${diaNumero(primeiraData)}
      </b>

      <small>
        ${mesAbreviado(primeiraData)}
      </small>
    `;
  }
}


// --------------------------------------------------
// HORÁRIOS
// --------------------------------------------------

function horarioTexto(hora) {
  return hora.substring(
    0,
    5
  );
}


function contarReservas(aulaId) {
  return reservasPorAula[aulaId] || 0;
}


function contarListaEspera(aulaId) {
  return listaEsperaPorAula[aulaId] || 0;
}


async function mostrarListaEspera(aulaId) {

  const {
    data,
    error
  } = await supabase.rpc(
    "consultar_nomes_lista_espera_por_aula",
    {
      p_aula_id: aulaId
    }
  );

  if (error) {

    console.error(
      "Erro ao consultar lista de espera:",
      error
    );

    alert(
      "Não foi possível consultar a lista de espera."
    );

    return;
  }

  const nomes =
    (data || [])
      .map(item => item.nome)
      .filter(Boolean);

  if (!nomes.length) {

    alert(
      "Nenhuma pessoa está na lista de espera."
    );

    return;
  }


  const overlay =
    document.createElement("div");

  overlay.id =
    "listaEsperaModal";

  overlay.style.position =
    "fixed";

  overlay.style.inset =
    "0";

  overlay.style.background =
    "rgba(22, 54, 92, 0.38)";

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
    document.createElement("div");

  modal.style.width =
    "min(420px, 100%)";

  modal.style.background =
    "#fffdf9";

  modal.style.border =
    "1px solid #dfe5eb";

  modal.style.borderRadius =
    "16px";

  modal.style.boxShadow =
    "0 18px 50px rgba(22, 54, 92, 0.18)";

  modal.style.padding =
    "24px";


  const titulo =
    document.createElement("h3");

  titulo.textContent =
    "Lista de espera";

  titulo.style.margin =
    "0 0 6px";

  titulo.style.color =
    "#16365c";

  titulo.style.fontFamily =
    '"DM Sans", Arial, sans-serif';

  titulo.style.fontSize =
    "20px";


  const subtitulo =
    document.createElement("p");

  subtitulo.textContent =
    `${nomes.length} ${
      nomes.length === 1
        ? "pessoa está"
        : "pessoas estão"
    } na lista de espera.`;

  subtitulo.style.margin =
    "0 0 18px";

  subtitulo.style.color =
    "#71809a";

  subtitulo.style.fontFamily =
    '"DM Sans", Arial, sans-serif';

  subtitulo.style.fontSize =
    "13px";


  const lista =
    document.createElement("div");

  lista.style.display =
    "flex";

  lista.style.flexDirection =
    "column";

  lista.style.gap =
    "8px";


  nomes.forEach(
    (nome, indice) => {

      const item =
        document.createElement("div");

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

      item.style.fontFamily =
        '"DM Sans", Arial, sans-serif';

      item.style.fontSize =
        "14px";

      item.style.fontWeight =
        "700";

      item.textContent =
        `${indice + 1}. ${nome}`;

      lista.appendChild(item);

    }
  );


  const fechar =
    document.createElement("button");

  fechar.type =
    "button";

  fechar.textContent =
    "Fechar";

  fechar.style.width =
    "100%";

  fechar.style.marginTop =
    "20px";

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

  fechar.style.fontFamily =
    '"DM Sans", Arial, sans-serif';

  fechar.style.fontWeight =
    "700";

  fechar.style.cursor =
    "pointer";


  fechar.addEventListener(
    "click",
    () => {

      overlay.remove();

    }
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


  modal.appendChild(
    titulo
  );

  modal.appendChild(
    subtitulo
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
}


// --------------------------------------------------
// ABRIR RESERVA DA TURMA
// --------------------------------------------------

function abrirReservaDaAula(
  aulaId
) {
  aulaSelecionada =
    aulas.find(
      aula =>
        aula.id === aulaId
    );

  if (!aulaSelecionada) {
    return;
  }

  const reservasAtuais =
    contarReservas(
      aulaSelecionada.id
    );

  const capacidade =
    Number(
      aulaSelecionada.capacidade
    );

  modoListaEspera =
    reservasAtuais >= capacidade;

  const botaoReserva =
    document.getElementById(
      "reserveBtn"
    );

  if (botaoReserva) {
    botaoReserva.textContent =
      modoListaEspera
        ? "Entrar na lista de espera"
        : "Confirmar reserva";
  }

  if (modalSubtitle) {
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

  if (form) {
    form.classList.remove(
      "hidden"
    );
  }

  if (message) {
    message.textContent = "";
  }

  if (backdrop) {
    backdrop.classList.add(
      "open"
    );
  }
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

  if (!lista) {
    return;
  }

  const aulasDoDia =
    aulas.filter(
      aula =>
        aula.data ===
        dataSelecionada
    );

  const grupos = {};

  aulasDoDia.forEach(aula => {
    const chave =
      `${aula.horario_inicio}-${aula.horario_fim}`;

    if (!grupos[chave]) {
      grupos[chave] = {
        inicio:
          aula.horario_inicio,

        fim:
          aula.horario_fim,

        aulas: []
      };
    }

    grupos[chave]
      .aulas
      .push(aula);
  });

  const horarios =
    Object.values(
      grupos
    );

  if (disponibilidade) {
    disponibilidade.textContent =
      `${horarios.length} ${
        horarios.length === 1
          ? "horário"
          : "horários"
      }`;
  }

  if (!horarios.length) {
    lista.innerHTML = `
      <div class="info-strip">
        <div class="info-icon">
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
      .map(grupo => {

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
          totalCapacidade > 0
            ? Math.min(
                100,
                Math.round(
                  (
                    totalReservado /
                    totalCapacidade
                  ) * 100
                )
              )
            : 0;

        const quantidadeTurmas =
          grupo.aulas.length;

        return `
          <article
            class="time-card"
          >

            <div class="time-main">

              <div class="time-icon">
                ${horarioTexto(
                  grupo.inicio
                ).substring(0, 2)}
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
                    quantidadeTurmas === 1
                      ? "turma disponível"
                      : "turmas disponíveis"
                  }
                </span>

              </div>

            </div>


            <div class="capacity">

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
                totalNaLista > 0
                  ? `
                    <small>
                      ${totalNaLista}

                      ${
                        totalNaLista === 1
                          ? "pessoa"
                          : "pessoas"
                      }

                      na lista de espera
                    </small>
                  `
                  : ""
              }


              <div class="progress">

                <span
                  style="
                    width:${percentual}%
                  "
                ></span>

              </div>

            </div>


            <div class="class-grid">

              ${grupo.aulas
                .map(aula => {

                  const reservasAula =
                    contarReservas(
                      aula.id
                    );

                  const vagasRestantes =
                    Number(
                      aula.capacidade
                    ) -
                    reservasAula;

                  const pessoasNaEspera =
                    contarListaEspera(
                      aula.id
                    );

                  const lotada =
                    vagasRestantes <= 0;

                  return `
                    <button
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
                          ${aula.turma}
                        </strong>
                      </span>

                      <span
                        class="class-meta"
                      >

                        ${
                          pessoasNaEspera > 0
                            ? `
                              <span
                                class="wait-badge"
                                data-wait-aula-id="${aula.id}"
                                role="button"
                                tabindex="0"
                              >
                                ${pessoasNaEspera} na espera
                              </span>
                            `
                            : ""
                        }

                        <small>
                          ${reservasAula}/${aula.capacidade}
                        </small>

                        <b>
                          ›
                        </b>

                      </span>

                    </button>
                  `;
                })
                .join("")}

            </div>

          </article>
        `;
      })
      .join("");

  lista
    .querySelectorAll(
      ".inline-class-option"
    )
    .forEach(botao => {

      botao.addEventListener(
        "click",
        () => {

          abrirReservaDaAula(
            botao.dataset.aulaId
          );

        }
      );

    });


  lista
    .querySelectorAll(
      ".wait-badge"
    )
    .forEach(badge => {

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
            event.key === "Enter" ||
            event.key === " "
          ) {

            event.preventDefault();
            event.stopPropagation();

            mostrarListaEspera(
              badge.dataset.waitAulaId
            );

          }

        }
      );

    });

}


// --------------------------------------------------
// RESERVAR
// --------------------------------------------------

document
  .getElementById(
    "reserveBtn"
  )
  ?.addEventListener(
    "click",
    async () => {

      const nome =
        document
          .getElementById(
            "nameInput"
          )
          ?.value
          .trim() ||
        "";

      const whatsapp =
        document
          .getElementById(
            "phoneInput"
          )
          ?.value
          .trim() ||
        "";

      if (!aulaSelecionada) {
        message.textContent =
          "Escolha uma turma.";

        return;
      }

      if (
        !nome ||
        !whatsapp
      ) {

        message.textContent =
          "Preencha seu nome e WhatsApp.";

        return;
      }

      const reservasAtuais =
        contarReservas(
          aulaSelecionada.id
        );

      const capacidade =
        Number(
          aulaSelecionada.capacidade
        );

      if (
        !modoListaEspera &&
        reservasAtuais >=
          capacidade
      ) {

        message.textContent =
          "Essa turma acabou de ficar lotada.";

        return;
      }

      const botao =
        document.getElementById(
          "reserveBtn"
        );

      botao.disabled =
        true;

      botao.textContent =
        "Confirmando...";

      let data;
      let error;

      if (
        modoListaEspera
      ) {

        const resposta =
          await supabase.rpc(
            "entrar_lista_espera",
            {
              p_aula_id:
                aulaSelecionada.id,

              p_nome:
                nome,

              p_whatsapp:
                whatsapp
            }
          );

        data =
          resposta.data;

        error =
          resposta.error;

      } else {

        const resposta =
          await supabase.rpc(
            "reservar_aula",
            {
              p_aula_id:
                aulaSelecionada.id,

              p_nome:
                nome,

              p_whatsapp:
                whatsapp
            }
          );

        data =
          resposta.data;

        error =
          resposta.error;

      }

      botao.disabled =
        false;

      botao.textContent =
        modoListaEspera
          ? "Entrar na lista de espera"
          : "Confirmar reserva";

      if (error) {

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
          "Você entrou na lista de espera.";

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

      if (nameInput) {
        nameInput.value = "";
      }

      if (phoneInput) {
        phoneInput.value = "";
      }

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

      if (backdrop) {
        backdrop.classList.remove(
          "open"
        );
      }

    }
  );


if (backdrop) {

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

      if (receiptModal) {
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

      if (receiptModal) {
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
        document
          .getElementById(
            "receiptInput"
          )
          ?.value
          .trim() ||
        "";

      const receiptMessage =
        document.getElementById(
          "receiptMessage"
        );

      if (!receiptMessage) {
        return;
      }

      if (!whatsapp) {

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

      if (error) {

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
          ${reserva.nome}
          <br>
          ${reserva.turma}
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
        `;

        return;
      }

      const {
        data: listaEsperaData,
        error: listaEsperaError
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
        ${espera.nome}
        <br>
        ${espera.turma}
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

  if (!lista) {
    return;
  }

  lista.innerHTML = `
    <div class="info-strip">

      <div class="info-icon">
        !
      </div>

      <div>

        <strong>
          Ops!
        </strong>

        <span>
          ${texto}
        </span>

      </div>

    </div>
  `;
}


// --------------------------------------------------
// INICIAR
// --------------------------------------------------

carregarDados();
