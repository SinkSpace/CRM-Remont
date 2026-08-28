async function send(device, model, SN, crush, note) {
  const message = document.getElementById("msg").value;
  const out = document.getElementById("out");

  out.textContent = "⏳ думает...";

  const fullMessage = `
    Ты — консультант по ремонту техники.
    
    Информация о заявке:
    - Устройство: ${device || 'не указано'}
    - Модель: ${model || 'не указана'}
    - Серийный номер: ${SN || 'не указан'}
    - Неисправность: ${crush || 'не описана'}
    - Примечания: ${note || 'отсутствуют'}
    
    Предложи варианты устранения неисправности.
  `;


  const res = await fetch("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fullMessage }),
    /*body: JSON.stringify({ message }),*/
  });

  const data = await res.json();

  out.textContent = data.text || JSON.stringify(data, null, 2);
}