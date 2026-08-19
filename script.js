function getEscudo(time) {
  const caminho = ESCUDOS[time];
  if (caminho) {
    return `<img src="${caminho}" alt="${time}" class="escudo-time">`;
  }
  return '';
}

let avatarMap = {};
let palpitesMap = {};
let resultadosMap = {};
let currentUser = null;
let historicoUser = null;
let currentTab = 'jogos';
let firebaseReady = false;
let quantidadeJogos = 5;
const LIMITE_JOGOS = 5;


async function carregarDadosIniciais() {
  try {
    const [avatarsSnap, palpitesSnap, resultadosSnap] = await Promise.all([
      getDocs(collection(db, 'avatars')),
      getDocs(collection(db, 'palpites')),
      getDocs(collection(db, 'resultados'))
    ]);

    avatarMap = {};
    avatarsSnap.forEach(item => {
      avatarMap[item.id] = item.data().foto;
    });

    palpitesMap = {};
    palpitesSnap.forEach(item => {
      const data = item.data();
      palpitesMap[item.id] = { g1: Number(data.g1), g2: Number(data.g2) };
    });

    resultadosMap = {};
    resultadosSnap.forEach(item => {
      const data = item.data();
      resultadosMap[item.id] = { g1: Number(data.g1), g2: Number(data.g2) };
    });

    firebaseReady = true;
    renderHome();
    observarMudancas();
  } catch (error) {
    console.error(error);
    toast('Erro ao conectar no Firebase. Veja se o Firestore foi criado.');
    renderHome();
  }
}

function toggleMostrarJogos() {
  const scrollAtual = window.scrollY;
  quantidadeJogos += 5;
  abrirPalpite(currentUser);
  window.scrollTo(0, scrollAtual);
}

window.toggleMostrarJogos = toggleMostrarJogos;

function observarMudancas() {
  onSnapshot(collection(db, 'avatars'), snapshot => {
    avatarMap = {};
    snapshot.forEach(item => {
      avatarMap[item.id] = item.data().foto;
    });
    renderProfiles();
    if (currentTab === 'ranking') renderRanking();
  });

  onSnapshot(collection(db, 'palpites'), snapshot => {
    palpitesMap = {};
    snapshot.forEach(item => {
      const data = item.data();
      palpitesMap[item.id] = { g1: Number(data.g1), g2: Number(data.g2) };
    });
    if (currentTab === 'ranking') renderRanking();
  });

  onSnapshot(collection(db, 'resultados'), snapshot => {
    resultadosMap = {};
    snapshot.forEach(item => {
      const data = item.data();
      resultadosMap[item.id] = { g1: Number(data.g1), g2: Number(data.g2) };
    });
    renderJogos();
    if (currentTab === 'ranking') renderRanking();
  });
}


function renderHome() {
  const hoje = new Date();
  document.getElementById('hoje-data').textContent =
    hoje.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });

  renderProfiles();
  renderJogos();
}

function renderProfiles() {
  const grid = document.getElementById('profiles-grid');
  grid.innerHTML = '';

  PROFILES.forEach(p => {
    const hasImg = !!avatarMap[p.id];
    const btn = document.createElement('button');
    btn.className = 'profile-btn';
    btn.innerHTML = `
       <div class="avatar-wrap">
       <div class="avatar ${hasImg ? '' : 'c-' + p.id}" id="av-${p.id}">
       ${hasImg ? `<img src="${avatarMap[p.id]}" alt="${p.name}">` : `<span>${p.init}</span>`}
       </div>

       <div class="upload-badge" title="Trocar foto" aria-label="Trocar foto de ${p.name}">
        <img src="img/bandeira.svg" alt="Trocar foto">
       </div>
       </div>

       <span class="profile-name">${p.name}</span>`;

    btn.querySelector('.upload-badge').addEventListener('click', e => {
      e.stopPropagation();
      uploadFoto(p.id);
    });

    btn.addEventListener('click', () => abrirPalpite(p));
    grid.appendChild(btn);
  });
}

function renderJogos() {
  const list = document.getElementById('jogos-list');
  list.innerHTML = '';

  const hoje = new Date().toLocaleDateString('pt-BR');

  const jogosHoje = JOGOS.filter(j => j.data === hoje);

  jogosHoje.forEach(j => {
    const r = resultadosMap[j.id];

    const placarHtml = r != null
      ? `<div style="text-align:center;padding:6px 0 0">
           <span style="font-size:20px;font-weight:800;color:var(--green)">${r.g1} – ${r.g2}</span>
           <span style="font-size:11px;color:var(--muted);display:block">resultado oficial</span>
         </div>`
      : '';

    list.innerHTML += `
      <div class="jogo-card">
        <div class="jogo-time">
          <span class="jogo-escudo">${getEscudo(j.time1)}</span>
          <span class="jogo-time-name">${j.time1}</span>
        </div>

        <div class="jogo-centro">
          ${j.fase ? `<div class="jogo-fase">${j.fase}</div>` : ''}
          <div class="jogo-vs">×</div>
          <span class="jogo-hora">${j.hora}</span>
          <span class="jogo-data">${j.data}</span>
          ${placarHtml}
        </div>

        <div class="jogo-time">
          <span class="jogo-escudo">${getEscudo(j.time2)}</span>
          <span class="jogo-time-name">${j.time2}</span>
        </div>
      </div>`;
  });

  if (jogosHoje.length === 0) {
    list.innerHTML = `
      <p style="text-align:center;color:var(--muted);font-size:14px;padding:20px 0">
        Nenhum jogo cadastrado para hoje.
      </p>`;
  }

  renderAdminJogos();
}

function renderAdminJogos() {
  const ap = document.getElementById('admin-jogos');
  if (!ap) return;

  ap.innerHTML = '';

  const hoje = new Date().toLocaleDateString('pt-BR');
  const jogosHoje = JOGOS.filter(j => j.data === hoje);

  jogosHoje.forEach(j => {
    const r = resultadosMap[j.id] || {};

    ap.innerHTML += `
      <div class="admin-jogo">
        <label>${getEscudo(j.time1)} ${j.time1} × ${j.time2} ${getEscudo(j.time2)}</label>
        <div class="admin-score-row">
          <input type="number" min="0" max="20" id="r1-${j.id}" value="${r.g1 ?? ''}" placeholder="0">
          <span>×</span>
          <input type="number" min="0" max="20" id="r2-${j.id}" value="${r.g2 ?? ''}" placeholder="0">
        </div>
      </div>`;
  });

  if (jogosHoje.length === 0) {
    ap.innerHTML = `
      <p style="text-align:center;color:var(--muted);font-size:14px;padding:12px 0">
        Nenhum jogo cadastrado para hoje.
      </p>`;
  }
}


function showTab(tab) {
  currentTab = tab;
  document.getElementById('tab-jogos').style.display = tab === 'jogos' ? '' : 'none';
  document.getElementById('tab-ranking').style.display = tab === 'ranking' ? '' : 'none';

  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0) === (tab === 'jogos'));
  });

  if (tab === 'ranking') renderRanking();
}


function getPontos(userId) {
  let total = 0, certos = 0, cravados = 0;

  JOGOS.forEach(j => {
    const r = resultadosMap[j.id];
    const pal = palpitesMap[`${userId}-${j.id}`];
    if (!r || !pal) return;

    const acertouPlacar = pal.g1 === r.g1 && pal.g2 === r.g2;
    if (acertouPlacar) {
      total += 10;
      cravados++;
      return;
    }

    const vencR = r.g1 > r.g2 ? 1 : r.g1 < r.g2 ? 2 : 0;
    const vencP = pal.g1 > pal.g2 ? 1 : pal.g1 < pal.g2 ? 2 : 0;

    if (vencR === vencP) {
      total += 5;
      certos++;
    }
  });

  return { total, certos, cravados };
}

function renderRanking() {
  const data = PROFILES.map(p => ({ ...p, ...getPontos(p.id) }))
    .sort((a, b) => b.total - a.total);
  const medals = ['🥇', '🥈', '🥉'];
  const list = document.getElementById('ranking-list');
  list.innerHTML = '';

  data.forEach((p, i) => {
    const hasImg = !!avatarMap[p.id];
    list.innerHTML += `
      <div class="ranking-item">
        <span class="rank-pos">${medals[i] || (i + 1)}</span>
        <div class="rank-avatar ${hasImg ? '' : 'c-' + p.id}">
          ${hasImg ? `<img src="${avatarMap[p.id]}" alt="${p.name}">` : p.init}
        </div>
        <div class="rank-info">
          <div class="rank-name">${p.name}</div>
          <div class="rank-sub">${p.cravados} placar(es) cravado(s) · ${p.certos} vencedor(es)</div>
        </div>
        <span class="rank-pts">${p.total}pts</span>
      </div>`;
  });

  if (data.every(p => p.total === 0)) {
    list.innerHTML += `<p style="text-align:center;color:var(--muted);font-size:14px;padding:20px 0">Lance os resultados para ver a pontuação!</p>`;
  }
}


function jogoJaComecou(jogo) {
  const [dia, mes, ano] = jogo.data.split('/');
  const [hora, minuto] = jogo.hora.split(':');

  const dataHoraJogo = new Date(
    Number(ano),
    Number(mes) - 1,
    Number(dia),
    Number(hora),
    Number(minuto)
  );

  const agora = new Date();

  return agora >= dataHoraJogo;
}

function abrirPalpite(profile, scrollTop= true) {
  if (currentUser?.id !== profile.id) {
    quantidadeJogos = 5;
  }
  currentUser = profile;

  const hasImg = !!avatarMap[profile.id];
  const av = document.getElementById('pal-avatar');
  av.className = `palpite-avatar${hasImg ? '' : ' c-' + profile.id}`;
  av.innerHTML = hasImg
    ? `<img src="${avatarMap[profile.id]}" alt="${profile.name}">`
    : profile.init;

  document.getElementById('pal-name').textContent = profile.name;

  const cards = document.getElementById('palpite-cards');
  cards.innerHTML = '';


  const jogosFiltrados = JOGOS.filter(j => {
    const [dia, mes, ano] = j.data.split('/');
    const [hora, minuto] = j.hora.split(':');

    const fimJogo = new Date(
      Number(ano),
      Number(mes) - 1,
      Number(dia),
      Number(hora),
      Number(minuto)
    );

    fimJogo.setHours(fimJogo.getHours() + 2);

    const umaHoraDepoisDoFim = new Date(
      fimJogo.getTime() + 60 * 60 * 1000
    );

    return new Date() < umaHoraDepoisDoFim;
  });

  const jogosParaMostrar = jogosFiltrados.slice(0, quantidadeJogos);

  jogosParaMostrar.forEach(j => {
    const saved = palpitesMap[`${profile.id}-${j.id}`] || {};
    const hasSaved = saved.g1 != null;

    cards.innerHTML += `
      <div class="palpite-card">

        ${j.fase ? `<div class="palpite-fase">${j.fase}</div>` : ''}

        <div class="palpite-card-header">
          <span class="palpite-jogo-info">${j.data}</span>
          <span class="palpite-jogo-hora">${j.hora}</span>
        </div>

        <div class="palpite-times-row">
          <div class="palpite-time">
            <span class="palpite-escudo">${getEscudo(j.time1)}</span>
            <span class="palpite-time-name">${j.time1}</span>
          </div>

          <div class="palpite-score">
            <input class="score-input" type="number" min="0" max="20"
              id="s1-${j.id}"
              value="${saved.g1 ?? ''}"
              placeholder="0"
              inputmode="numeric"
              ${jogoJaComecou(j) ? 'disabled' : ''}>

            <span class="score-x">×</span>

            <input class="score-input" type="number" min="0" max="20"
              id="s2-${j.id}"
              value="${saved.g2 ?? ''}"
              placeholder="0"
              inputmode="numeric"
              ${jogoJaComecou(j) ? 'disabled' : ''}>
          </div>

          <div class="palpite-time">
            <span class="palpite-escudo">${getEscudo(j.time2)}</span>
            <span class="palpite-time-name">${j.time2}</span>
          </div>
        </div>

        <div class="saved-badge ${hasSaved ? 'show' : ''}" id="badge-${j.id}">
          ✅ Palpite salvo: ${saved.g1 ?? '?'} × ${saved.g2 ?? '?'}
        </div>

        ${jogoJaComecou(j)
        ? `<div class="lock-badge">🔒 Palpite encerrado</div>`
        : ''}
      </div>
    `;
  });

  if (quantidadeJogos < jogosFiltrados.length) {
    cards.innerHTML += `
    <button class="btn-mostrar-jogos" onclick="toggleMostrarJogos()">
      Mostrar mais 
    </button>
  `;
  }

  document.getElementById('screen-home').classList.remove('active');
  document.getElementById('screen-palpite').classList.add('active');

  if (scrollTop) {
    window.scrollTo(0, 0);
  }
}

async function salvarPalpites() {
  if (!currentUser) return;

  let salvou = 0;
  const promessas = [];

  JOGOS.forEach(j => {
    if (jogoJaComecou(j)) return;

    const input1 = document.getElementById(`s1-${j.id}`);
    const input2 = document.getElementById(`s2-${j.id}`);
    if (!input1 || !input2) return;

    const v1 = input1.value;
    const v2 = input2.value;

    if (v1 !== '' && v2 !== '') {
      const palpite = {
        usuario: currentUser.id,
        usuarioNome: currentUser.name,
        jogo: j.id,
        time1: j.time1,
        time2: j.time2,
        g1: parseInt(v1, 10),
        g2: parseInt(v2, 10),
        atualizadoEm: serverTimestamp()
      };

      palpitesMap[`${currentUser.id}-${j.id}`] = {
        g1: palpite.g1,
        g2: palpite.g2
      };

      promessas.push(
        setDoc(doc(db, 'palpites', `${currentUser.id}-${j.id}`), palpite)
      );

      const badge = document.getElementById(`badge-${j.id}`);
      if (badge) {
        badge.textContent = `✅ Palpite salvo: ${v1} × ${v2}`;
        badge.classList.add('show');
      }

      salvou++;
    }
  });

  if (salvou === 0) {
    toast('Preencha ao menos um palpite aberto antes de salvar');
    return;
  }

  try {
    await Promise.all(promessas);
    toast(`Palpites da ${currentUser.name} salvos!`);
    setTimeout(goHome, 900);
  } catch (error) {
    console.error(error);
    toast('Erro ao salvar no Firebase. Verifique as regras do Firestore.');
  }
}

function goHome() {
  document.getElementById('screen-palpite').classList.remove('active');
  document.getElementById('screen-home').classList.add('active');
  renderProfiles();
  renderJogos();
  window.scrollTo(0, 0);
}


function toggleAdmin() {
  document.getElementById('admin-panel').classList.toggle('show');
}


function abrirHistorico() {
  historicoUser = null;

  renderHistoricoProfiles();
  document.getElementById('historico-lista').style.display = 'none';
  document.getElementById('historico-profiles-grid').style.display = '';
  document.getElementById('historico-subtitle').textContent = 'Escolha uma prima para ver o histórico';

  document.getElementById('screen-home').classList.remove('active');
  document.getElementById('screen-historico').classList.add('active');
  window.scrollTo(0, 0);
}
window.abrirHistorico = abrirHistorico;

function renderHistoricoProfiles() {
  const grid = document.getElementById('historico-profiles-grid');
  grid.innerHTML = '';

  PROFILES.forEach(p => {
    const hasImg = !!avatarMap[p.id];
    const btn = document.createElement('button');
    btn.className = 'profile-btn';
    btn.innerHTML = `
       <div class="avatar-wrap">
       <div class="avatar ${hasImg ? '' : 'c-' + p.id}">
       ${hasImg ? `<img src="${avatarMap[p.id]}" alt="${p.name}">` : `<span>${p.init}</span>`}
       </div>
       </div>

       <span class="profile-name">${p.name}</span>`;

    btn.addEventListener('click', () => abrirHistoricoPerfil(p));
    grid.appendChild(btn);
  });
}

function abrirHistoricoPerfil(profile) {
  historicoUser = profile;

  document.getElementById('historico-profiles-grid').style.display = 'none';
  document.getElementById('historico-subtitle').textContent = `Palpites de ${profile.name}`;

  const lista = document.getElementById('historico-lista');
  lista.style.display = '';
  lista.innerHTML = '';

  
  const jogosPassados = JOGOS
    .filter(j => resultadosMap[j.id] != null)
    .slice()
    .reverse();

  if (jogosPassados.length === 0) {
    lista.innerHTML = `
      <p style="text-align:center;color:var(--muted);font-size:14px;padding:20px 0">
        Nenhum resultado lançado ainda.
      </p>`;
    return;
  }

  jogosPassados.forEach(j => {
    const r = resultadosMap[j.id];
    const pal = palpitesMap[`${profile.id}-${j.id}`];

    let statusHtml = `<span class="hist-status hist-sem">Sem palpite</span>`;

    if (pal) {
      const acertouPlacar = pal.g1 === r.g1 && pal.g2 === r.g2;
      const vencR = r.g1 > r.g2 ? 1 : r.g1 < r.g2 ? 2 : 0;
      const vencP = pal.g1 > pal.g2 ? 1 : pal.g1 < pal.g2 ? 2 : 0;

      if (acertouPlacar) {
        statusHtml = `<span class="hist-status hist-cravou">🎯 Cravou! +10pts</span>`;
      } else if (vencR === vencP) {
        statusHtml = `<span class="hist-status hist-acertou">✅ Acertou +5pts</span>`;
      } else {
        statusHtml = `<span class="hist-status hist-errou">❌ Errou</span>`;
      }
    }

    lista.innerHTML += `
      <div class="jogo-card hist-card">
        <div class="jogo-time">
          <span class="jogo-escudo">${getEscudo(j.time1)}</span>
          <span class="jogo-time-name">${j.time1}</span>
        </div>

        <div style="text-align:center">
          ${j.fase ? `<div class="jogo-fase">${j.fase}</div>` : ''}
          <span class="jogo-hora">${j.hora}</span>
          <span class="jogo-data">${j.data}</span>

          <div style="font-size:20px;font-weight:800;color:var(--green);margin-top:4px">
            ${r.g1} – ${r.g2}
          </div>
          <div style="font-size:11px;color:var(--muted);margin:0 0 6px">resultado oficial</div>

          <div style="font-size:14px;font-weight:700">
            ${pal ? `Palpite: ${pal.g1} × ${pal.g2}` : ''}
          </div>

          ${statusHtml}
        </div>

        <div class="jogo-time">
          <span class="jogo-escudo">${getEscudo(j.time2)}</span>
          <span class="jogo-time-name">${j.time2}</span>
        </div>
      </div>`;
  });
}
window.abrirHistoricoPerfil = abrirHistoricoPerfil;

function voltarHistorico() {
  if (historicoUser) {
    historicoUser = null;
    document.getElementById('historico-lista').style.display = 'none';
    document.getElementById('historico-profiles-grid').style.display = '';
    document.getElementById('historico-subtitle').textContent = 'Escolha uma prima para ver o histórico';
  } else {
    document.getElementById('screen-historico').classList.remove('active');
    document.getElementById('screen-home').classList.add('active');
    window.scrollTo(0, 0);
  }
}
window.voltarHistorico = voltarHistorico;

async function calcularPontos() {
  const promessas = [];
  let salvou = 0;

  JOGOS.forEach(j => {

    const input1 = document.getElementById(`r1-${j.id}`);
    const input2 = document.getElementById(`r2-${j.id}`);

    if (!input1 || !input2) return;

    const v1 = input1.value;
    const v2 = input2.value;

    if (
      v1 !== '' &&
      v2 !== '' &&
      !isNaN(Number(v1)) &&
      !isNaN(Number(v2))
    ) {

      const resultado = {
        jogo: j.id,
        time1: j.time1,
        time2: j.time2,
        g1: parseInt(v1, 10),
        g2: parseInt(v2, 10),
        atualizadoEm: serverTimestamp()
      };

      resultadosMap[j.id] = {
        g1: resultado.g1,
        g2: resultado.g2
      };

      promessas.push(
        setDoc(doc(db, 'resultados', j.id), resultado)
      );

      salvou++;
    }
  });

  if (salvou === 0) {
    toast('Preencha pelo menos um resultado');
    return;
  }

  try {
    await Promise.all(promessas);
    renderJogos();
    if (currentTab === 'ranking') renderRanking();
    toast('Resultados salvos! Pontos calculados 🏆');
    document.getElementById('admin-panel').classList.remove('show');
  } catch (error) {
    console.error(error);
    toast('Erro ao salvar resultados.');
  }
}


function uploadFoto(userId) {
  const input = document.getElementById('file-input');

  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const size = 120;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);

        const foto = canvas.toDataURL('image/jpeg', 0.8);
        avatarMap[userId] = foto;
        renderProfiles();

        try {
          await setDoc(doc(db, 'avatars', userId), {
            foto,
            atualizadoEm: serverTimestamp()
          });
          toast('Foto atualizada! 📸');
        } catch (error) {
          console.error(error);
          toast('Erro ao salvar foto.');
        }
      };
      img.src = ev.target.result;
    };

    reader.readAsDataURL(file);
    input.value = '';
  };

  input.click();
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

window.showTab = showTab;
window.salvarPalpites = salvarPalpites;
window.goHome = goHome;
window.toggleAdmin = toggleAdmin;
window.calcularPontos = calcularPontos;

renderHome();
carregarDadosIniciais();

