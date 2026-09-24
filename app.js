const slots = document.querySelectorAll(".slot");
const reserveDialog = document.getElementById("reserveDialog");
const receiptDialog = document.getElementById("receiptDialog");
const reserveForm = document.getElementById("reserveForm");
const selectedClass = document.getElementById("selectedClass");
const reservationNotice = document.getElementById("reservationNotice");

slots.forEach((slot) => {
  const header = slot.querySelector(".slot-header");
  header.addEventListener("click", () => {
    const isOpen = slot.classList.toggle("open");
    header.setAttribute("aria-expanded", String(isOpen));
  });
});

document.querySelectorAll(".reserve").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const card = button.closest(".class-card");
    const slot = button.closest(".slot");
    const time = slot.querySelector(".time").textContent.trim();
    const className = card.querySelector("strong").textContent.trim();

    selectedClass.textContent = `${className} · ${time}`;
    reservationNotice.hidden = true;
    reserveDialog.showModal();
  });
});

reserveForm.addEventListener("submit", (event) => {
  event.preventDefault();

  reservationNotice.textContent =
    "Reserva registrada nesta demonstração. Na próxima etapa vamos conectar ao banco de dados.";
  reservationNotice.hidden = false;

  reserveForm.reset();
});

document.getElementById("receiptButton").addEventListener("click", () => {
  receiptDialog.showModal();
});

document.getElementById("closeReceipt").addEventListener("click", () => {
  receiptDialog.close();
});
