# LibrePelota limpio

Userscript personal para bloquear popups del reproductor, evitar clics publicitarios y facilitar la reproducción en pantalla completa.

## Instalación rápida

Primero instalar Tampermonkey:

- [Chrome para Windows](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- [Firefox, compatible con Android](https://addons.mozilla.org/firefox/addon/tampermonkey/)

Después abrir este enlace y presionar **Instalar**:

### [Instalar LibrePelota limpio](https://raw.githubusercontent.com/fmalisani1/librepelota-limpio/main/librepelota-limpio.user.js)

Las instrucciones detalladas para Windows y Android están en [INSTALACION.md](INSTALACION.md).

## Funciones

- Bloquea `window.open` en los dominios del reproductor.
- Neutraliza los capturadores de clics de los scripts publicitarios identificados.
- Elimina iframes externos no utilizados por el reproductor.
- Habilita los permisos de reproducción y pantalla completa del iframe principal.
- Agrega el botón **Reproducir limpio**.
- Intenta cambiar a orientación horizontal al entrar en pantalla completa en Android.
- Incluye actualización automática mediante Tampermonkey.

## Privacidad

El script se ejecuta únicamente en los dominios indicados en sus reglas `@match`. No recopila ni transmite información personal.

## Aviso

El sitio o su reproductor pueden cambiar sin previo aviso. En ese caso habrá que actualizar las reglas o selectores del userscript.
