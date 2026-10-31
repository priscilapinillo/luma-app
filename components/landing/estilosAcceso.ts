// Estilos compartidos de las pantallas de entrar (terapeutas, Luma Links, aula, nueva contraseña). Blue Hour + Avigea (29/10).
// .au = terapeutas (panel oscuro) · .au.links = Luma Links (panel claro lavanda) · .au.aula = alumnas (panel crema)
export const ESTILOS_ACCESO = `
@font-face{font-family:'Avigea';src:url('/fonts/Avigea.ttf') format('truetype');font-display:swap}
body{margin:0;background:#F5EEE4}
.au{--tinta:#27344A;--tinta2:#6E7388;--azul:#4C5580;--lav:#626B91;--rosa:#D6A6A5;--crema:#F0E6D8;--card:#FFFCF7;--borde:#E6DCCE;
  min-height:100vh;min-height:100dvh;box-sizing:border-box;padding:16px;background:#F5EEE4;color:var(--tinta);font-family:'Inter',sans-serif;letter-spacing:-0.01em;display:flex;gap:16px}
.au *{box-sizing:border-box}
.au :is(a,button,input):focus-visible{outline:2px solid var(--lav);outline-offset:2px}
.au a{color:var(--azul);font-weight:700}
/* panel del costado */
.au-lado{position:relative;width:min(640px,46vw);flex-shrink:0;border-radius:36px;overflow:hidden;padding:40px 44px;color:var(--crema);display:flex;flex-direction:column;
  background:radial-gradient(520px 420px at 80% 60%,rgba(98,107,145,.6),transparent 70%),radial-gradient(420px 320px at 0% 100%,rgba(214,166,165,.3),transparent 70%),linear-gradient(160deg,#27344A,#1F2A3D)}
.au.links .au-lado{color:var(--tinta);background:radial-gradient(520px 420px at 80% 30%,rgba(255,255,255,.55),transparent 70%),linear-gradient(160deg,#DCD3E6 0%,#EADCE4 55%,#F6E4E2 100%)}
.au.aula .au-lado{color:var(--tinta);background:radial-gradient(520px 420px at 80% 30%,rgba(255,255,255,.5),transparent 70%),linear-gradient(160deg,#F7ECD3 0%,#F3E4DA 55%,#E9E3EF 100%)}
.au-estrella{position:absolute;pointer-events:none}
.au-logo{font-family:'Avigea','Cormorant Garamond',serif;font-size:38px;line-height:.9;color:inherit !important;text-decoration:none;font-weight:400 !important;align-self:flex-start}
.au-logo span,.au-logo-celu span{color:var(--rosa)}
.au.links .au-logo span,.au.aula .au-logo span{color:#A65A6E}
.au-logo small{font-family:'Inter',sans-serif;font-size:13px;font-weight:700;letter-spacing:2px;margin-left:8px;opacity:.7}
.au-frase{margin:34px 0 0;font-family:'Avigea','Cormorant Garamond',serif;font-weight:400;font-size:clamp(38px,3.6vw,50px);line-height:.9;letter-spacing:-.025em;max-width:480px}
.au-frase em{font-style:normal;color:var(--rosa)}
.au.links .au-frase em,.au.aula .au-frase em{color:#A65A6E}
.au-frase2{margin:14px 0 0;font-family:'Avigea','Cormorant Garamond',serif;font-size:34px;line-height:.9}
.au-subraya{position:relative;display:inline-block;z-index:0}
.au-subraya::after{content:'';position:absolute;left:0;right:0;bottom:.04em;height:.12em;border-radius:99px;background:var(--rosa);transform-origin:left;z-index:-1;animation:auSubraya 4s ease-in-out infinite alternate}
.au-vis{position:relative;flex:1;min-height:300px}
.au-tel{position:absolute;left:50%;top:20px;margin-left:-125px}
.au-tel>div{transform:perspective(1800px) rotateY(-12deg) rotateX(4deg) rotateZ(3deg);filter:drop-shadow(0 50px 44px rgba(0,0,0,.45))}
.au-notif{position:absolute;top:60px;right:-10px;width:260px;padding:11px 13px;border-radius:22px;background:rgba(250,247,242,.92);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);color:#1B1B1F;box-shadow:0 20px 44px rgba(0,0,0,.3);display:flex;gap:10px;align-items:center}
.au-notif-ic{width:36px;height:36px;border-radius:10px;background:#27344A;color:#F0E6D8;display:flex;align-items:center;justify-content:center;font-family:'Avigea',serif;font-size:24px;line-height:1;flex-shrink:0}
.au-notif-txt{display:flex;flex-direction:column}.au-notif-txt span:first-child{font-size:10.5px;color:#6B6B73;font-weight:700}.au-notif-txt strong{font-size:13px}.au-notif-txt span:last-child{font-size:12px;color:#3A3A40}
.au-lado-pie{position:relative;font-size:13px;opacity:.75}
.au-curso{position:absolute;left:50%;top:30px;width:330px;margin-left:-165px;border-radius:26px;background:var(--card);box-shadow:0 30px 60px rgba(39,52,74,.2);overflow:hidden}
.au-curso-portada{height:150px;padding:18px;display:flex;align-items:flex-end;background:radial-gradient(200px 140px at 85% 10%,rgba(255,255,255,.3),transparent 70%),#27344A;color:var(--crema);font-family:'Avigea','Cormorant Garamond',serif;font-size:36px;line-height:.9}
.au-curso-cuerpo{padding:16px 18px;display:flex;flex-direction:column;gap:10px}
.au-curso-barra{height:8px;border-radius:99px;background:#EFE7DB;overflow:hidden}.au-curso-barra span{display:block;height:100%;width:72%;border-radius:99px;background:#626B91}
.au-curso-fila{display:flex;justify-content:space-between;font-size:12.5px;color:var(--tinta2)}
.au-curso-clase{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:#FBF7F1;border:1px solid #EFE7DB;font-size:13px;font-weight:600}
.au-curso-clase i{width:30px;height:30px;border-radius:50%;background:#27344A;color:#F0E6D8;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.au-certif{position:absolute;right:6%;bottom:40px;padding:12px 16px;border-radius:18px;background:#D8EBDD;color:#24533A;box-shadow:0 20px 40px rgba(39,52,74,.2);font-size:13px;font-weight:700;display:flex;gap:8px;align-items:center}
/* formulario */
.au-main{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;padding:24px 0}
.au-caja{width:100%;max-width:440px;display:flex;flex-direction:column;gap:22px}
.au-logo-celu{display:none;font-family:'Avigea','Cormorant Garamond',serif;font-size:34px;line-height:.9;color:var(--tinta) !important;text-decoration:none;font-weight:400 !important;align-self:center}
.au-tabs{display:flex;gap:4px;padding:5px;border-radius:18px;background:var(--card);border:1px solid var(--borde);box-shadow:0 6px 18px rgba(39,52,74,.05)}
.au-tabs button{flex:1;min-height:46px;border-radius:13px;border:none;cursor:pointer;font:800 14px 'Inter',sans-serif;background:transparent;color:var(--tinta2);transition:all .25s}
.au-tabs button.on{background:var(--tinta);color:var(--crema);box-shadow:0 8px 18px rgba(39,52,74,.25)}
.au-form{display:flex;flex-direction:column;gap:16px}
.au-h1{margin:0;font-family:'Avigea','Cormorant Garamond',serif;font-weight:400;font-size:clamp(44px,5vw,60px);line-height:.88;letter-spacing:-.025em}
.au-sub{margin:8px 0 0;font-size:15px;line-height:1.4;color:var(--tinta2)}
.au-sub b{color:var(--tinta)}
.au-campo{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:700;color:var(--azul)}
.au-in{min-height:52px;border-radius:15px;border:1.5px solid var(--borde);background:var(--card);display:flex;align-items:center;gap:10px;padding:0 6px 0 14px;color:#9A9CAE;transition:border-color .2s,box-shadow .2s}
.au-in:focus-within{border-color:var(--lav);box-shadow:0 0 0 4px rgba(98,107,145,.14);color:var(--lav)}
.au-in input{flex:1;min-width:0;height:48px;border:none;background:transparent;outline:none;font:500 15px 'Inter',sans-serif;color:var(--tinta)}
.au-in input::placeholder{color:#B5B3C2}
.au-in input:focus-visible{outline:none}
.au-in.ok{border-color:#3E7D57}
.au-ojo{width:40px;height:40px;border-radius:11px;border:none;background:transparent;color:var(--tinta2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.au-ojo:hover{background:#FBF7F1}
.au-link{border:none;background:transparent;color:var(--azul);font:700 13.5px 'Inter',sans-serif;padding:8px 0;cursor:pointer;text-align:center;text-decoration:none}
.au-link.derecha{align-self:flex-end;margin-top:-8px}
.au-volver{align-self:flex-start;display:flex;align-items:center;gap:6px;border:none;background:transparent;color:var(--azul);font:700 13.5px 'Inter',sans-serif;padding:8px 0;cursor:pointer}
.au-btn{min-height:54px;border-radius:16px;border:none;background:linear-gradient(135deg,#27344A,#4C5580);color:var(--crema);font:800 15.5px 'Inter',sans-serif;box-shadow:0 14px 30px rgba(39,52,74,.3);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:transform .15s,opacity .2s}
.au-btn:active{transform:scale(.98)}
.au-btn:disabled{opacity:.7;cursor:default}
.au-btn-claro{min-height:48px;padding:0 20px;border-radius:14px;border:1px solid var(--borde);background:#FBF7F1;color:var(--tinta);font:700 14px 'Inter',sans-serif;cursor:pointer}
.au-girar{width:16px;height:16px;border-radius:50%;border:2px solid rgba(240,230,216,.35);border-top-color:#F0E6D8;animation:auGira 1s linear infinite;display:inline-block}
.au-error{padding:12px 14px;border-radius:14px;background:#F6E4E2;border:1px solid #EBCBC8;color:#8E3B3B;font-size:13.5px;line-height:1.4}
.au-aviso{padding:14px;border-radius:16px;font-size:13.5px;line-height:1.45;display:flex;flex-direction:column;gap:10px}
.au-aviso.citrino{background:#F7ECD3;border:1px solid #E9D6A6;color:#5A4416}
.au-aviso.citrino a{color:#5A4416;text-decoration:underline}
.au-aviso.lavanda{background:#E9E3EF;border:1px solid #D9CDE6;color:var(--tinta)}
.au-otros{display:flex;flex-direction:column;gap:8px;padding:14px 16px;border-radius:18px;background:#FBF7F1;border:1px solid #EFE7DB;font-size:13px;color:var(--tinta2)}
.au-fuerza{display:flex;align-items:center;gap:8px;margin-top:-6px}
.au-fuerza span{flex:1;height:5px;border-radius:3px;background:var(--borde);transition:background .3s}
.au-fuerza span.f1{background:#A24B47}.au-fuerza span.f2{background:#D9A62E}.au-fuerza span.f3{background:#3E7D57}
.au-fuerza b{font-size:12px;white-space:nowrap}.au-fuerza b.f1{color:#A24B47}.au-fuerza b.f2{color:#8A5A0B}.au-fuerza b.f3{color:#3E7D57}
.au-pastillas{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.au-pastillas span{padding:7px 12px;border-radius:99px;font-size:12px;font-weight:800}
.au-pastillas .verde{background:#D8EBDD;color:#2F6646}.au-pastillas .lavanda{background:#E9E3EF;color:#4C5580}.au-pastillas .citrino{background:#F7ECD3;color:#8A5A0B}
.au-tarjeta{display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;padding:36px 30px;border-radius:30px;background:var(--card);border:1px solid var(--borde);box-shadow:0 20px 44px rgba(39,52,74,.1)}
.au-ic-grande{width:84px;height:84px;border-radius:26px;background:#DCD3E6;color:var(--tinta);display:flex;align-items:center;justify-content:center;box-shadow:0 14px 30px rgba(98,107,145,.3)}
.au-ic-grande.ok{border-radius:50%;background:#3E7D57;color:#FFFCF7;box-shadow:0 14px 30px rgba(62,125,87,.35)}
@keyframes auGira{to{transform:rotate(360deg)}}
@keyframes auFlotar{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes auCaer{0%,8%{opacity:0;transform:translateY(-26px) scale(.94)}16%,78%{opacity:1;transform:none}88%,100%{opacity:0;transform:translateY(-10px)}}
@keyframes auTitila{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:1;transform:scale(1.1)}}
@keyframes auEntra{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes auPop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.12);opacity:1}100%{transform:scale(1)}}
@keyframes auSubraya{0%,15%{transform:scaleX(0)}45%,100%{transform:scaleX(1)}}
.au-flotar{animation:auFlotar 6s ease-in-out infinite}
.au-caer{animation:auCaer 7s ease-in-out infinite}
.au-titila{animation:auTitila 2.4s ease-in-out infinite}
.au-entra{animation:auEntra .45s cubic-bezier(.2,.8,.2,1) both}
.au-pop{animation:auPop .6s cubic-bezier(.2,.8,.2,1) both}
@media(max-width:1100px){.au-lado{width:42vw;padding:32px}.au-notif{right:-20px}}
@media(max-width:900px){
  .au{padding:0;display:block}
  .au-lado{display:none}
  .au-main{padding:28px 18px 40px;min-height:100vh;min-height:100dvh;align-items:flex-start;background:radial-gradient(420px 260px at 50% 0%,rgba(220,211,230,.8),transparent 70%),#F5EEE4}
  .au-logo-celu{display:block}
  .au-in input{font-size:16px}
  .au-h1{font-size:46px}
}
@media (prefers-reduced-motion:reduce){.au *,.au *::before,.au *::after{animation:none !important;transition:none !important}}
`
