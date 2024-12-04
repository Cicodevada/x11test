const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  const taskbar = document.getElementById('taskbar');

  // Função para listar os aplicativos abertos (exemplo)
  function listApps() {
    const apps = [
      { id: 1, name: 'Terminal', icon: 'terminal.png' },
      { id: 2, name: 'Editor', icon: 'editor.png' },
      // Adicione mais aplicativos conforme necessário
    ];

    taskbar.innerHTML = ''; // Limpar a taskbar antes de adicionar os ícones

    apps.forEach(app => {
      const appButton = document.createElement('div');
      appButton.classList.add('app-button');
      appButton.innerHTML = `<img src="${app.icon}" alt="${app.name}" /> ${app.name}`;

      appButton.addEventListener('click', () => {
        console.log(`Focando no aplicativo ${app.name}`);
        // Enviar comando para o main process para focar o app específico
      });

      taskbar.appendChild(appButton);
    });
  }

  listApps(); // Chama a função de listagem inicial
});
