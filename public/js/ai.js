async function send(device, model, SN, crush, note) {
  const message = document.getElementById("msg").value;
  const out = document.getElementById("out");

  out.textContent = "⏳ думает...";

  const res = await fetch("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  const data = await res.json();

  out.textContent = data.text || JSON.stringify(data, null, 2);
}