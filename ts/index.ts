import { Game } from "./game";

async function getAudioContext(): Promise<AudioContext> {
  const body = document.querySelector('body');
  const div = document.createElement('div');
  div.innerHTML = '<div>Conduct your destiny.</div>' +
    '<div>Be the conduit.</div>' +
    '<div>Click to begin</div>';
  div.classList.add('begin');
  body.appendChild(div);
  return new Promise((resolve) => {
    div.addEventListener('click', (ev) => {
      div.remove();
      resolve(new window.AudioContext());
    });
  });
}

async function go() {
  new Game(await getAudioContext());
}

go();
