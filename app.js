const form = document.querySelector('#credentials-form');
const statusNode = document.querySelector('#status');
const channelListNode = document.querySelector('#channel-list');
const filterNode = document.querySelector('#channel-filter');
const nowPlayingNode = document.querySelector('#now-playing');
const clearButton = document.querySelector('#clear-data');
const video = document.querySelector('#video');

const fields = {
  server: document.querySelector('#server'),
  username: document.querySelector('#username'),
  password: document.querySelector('#password'),
  streamFormat: document.querySelector('#stream-format'),
  corsProxy: document.querySelector('#cors-proxy'),
};

let channels = [];
let activeStreamId = null;
let hlsInstance = null;

const STORAGE_KEY = 'iptv-web-player-config';

init();

function init() {
  restoreForm();
  form.addEventListener('submit', onLoadChannels);
  filterNode.addEventListener('input', renderChannels);
  clearButton.addEventListener('click', clearSavedData);
}

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.classList.toggle('error', isError);
}

function saveForm() {
  const data = {
    server: fields.server.value.trim(),
    username: fields.username.value.trim(),
    password: fields.password.value.trim(),
    streamFormat: fields.streamFormat.value,
    corsProxy: fields.corsProxy.value.trim(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function restoreForm() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    fields.server.value = saved.server ?? '';
    fields.username.value = saved.username ?? '';
    fields.password.value = saved.password ?? '';
    fields.streamFormat.value = saved.streamFormat ?? 'm3u8';
    fields.corsProxy.value = saved.corsProxy ?? '';
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function clearSavedData() {
  localStorage.removeItem(STORAGE_KEY);
  form.reset();
  channels = [];
  renderChannels();
  stopVideo();
  setStatus('Dados locais removidos.');
}

function normalizeServer(server) {
  return server.replace(/\/+$/, '');
}

function withProxy(url) {
  const proxy = fields.corsProxy.value.trim();
  return proxy ? `${proxy}${encodeURIComponent(url)}` : url;
}

async function onLoadChannels(event) {
  event.preventDefault();
  saveForm();

  const server = normalizeServer(fields.server.value.trim());
  const username = fields.username.value.trim();
  const password = fields.password.value.trim();

  if (!server || !username || !password) {
    setStatus('Preencha URL, usuário e senha.', true);
    return;
  }

  setStatus('Carregando canais...');

  try {
    const url = `${server}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_streams`;

    const response = await fetch(withProxy(url));
    if (!response.ok) {
      throw new Error(`Falha HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Resposta inesperada do servidor.');
    }

    channels = data
      .filter((item) => item.stream_id && item.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    renderChannels();
    setStatus(`${channels.length} canais carregados.`);
  } catch (error) {
    console.error(error);
    channels = [];
    renderChannels();
    setStatus(
      'Não foi possível carregar os canais. Verifique dados, CORS e se a API do provedor está ativa.',
      true,
    );
  }
}

function renderChannels() {
  const query = filterNode.value.trim().toLowerCase();
  const visible = channels.filter((channel) => channel.name.toLowerCase().includes(query));

  channelListNode.innerHTML = '';

  if (!visible.length) {
    const empty = document.createElement('li');
    empty.textContent = channels.length
      ? 'Nenhum canal corresponde à busca.'
      : 'Nenhum canal carregado.';
    channelListNode.append(empty);
    return;
  }

  for (const channel of visible) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = channel.name;

    if (activeStreamId === channel.stream_id) {
      button.classList.add('active');
    }

    button.addEventListener('click', () => {
      playChannel(channel);
      renderChannels();
    });

    li.append(button);
    channelListNode.append(li);
  }
}

function buildStreamUrl(streamId) {
  const server = normalizeServer(fields.server.value.trim());
  const username = fields.username.value.trim();
  const password = fields.password.value.trim();
  const ext = fields.streamFormat.value === 'ts' ? 'ts' : 'm3u8';

  return `${server}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${streamId}.${ext}`;
}

function stopVideo() {
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
  video.pause();
  video.removeAttribute('src');
  video.load();
}

function playChannel(channel) {
  const streamUrl = withProxy(buildStreamUrl(channel.stream_id));

  stopVideo();
  activeStreamId = channel.stream_id;
  nowPlayingNode.textContent = `Tocando: ${channel.name}`;

  if (window.Hls?.isSupported() && fields.streamFormat.value === 'm3u8') {
    hlsInstance = new Hls();
    hlsInstance.loadSource(streamUrl);
    hlsInstance.attachMedia(video);
    hlsInstance.on(Hls.Events.ERROR, (_, data) => {
      console.error('Erro HLS:', data);
      setStatus('Erro ao reproduzir stream HLS. Teste outro formato ou proxy CORS.', true);
    });
    video.play().catch(() => {
      setStatus('Clique no player para iniciar a reprodução.', false);
    });
    return;
  }

  video.src = streamUrl;
  video.play().catch(() => {
    setStatus('Clique no player para iniciar a reprodução.', false);
  });
}
