const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  const taskbar = document.getElementById('taskbar');

  // Função para listar os aplicativos ativos
  ipcRenderer.on('update-processes', (event, processList) => {
    taskbar.innerHTML = ''; // Limpa a taskbar

    processList.forEach((process) => {
      const appButton = document.createElement('div');
      appButton.classList.add('app-button');
      appButton.innerText = process.command; // Nome do processo (pode mudar conforme necessário)

      appButton.addEventListener('click', () => {
        // Lógica para alternar o foco da janela, se possível
        console.log(`Focando no aplicativo: ${process.command}`);
        // Aqui, seria necessário usar uma ferramenta de controle de janela (como wmctrl ou similar)
        // para dar foco à janela do processo clicado, mas isso depende do sistema.
      });

      taskbar.appendChild(appButton);
    });
  });
});
