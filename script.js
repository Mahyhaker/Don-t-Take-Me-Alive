// Gerenciamento do tema
const initTheme = () => {
    const toggleButton = document.getElementById('themeToggle');
    const root = document.documentElement;

    // Verifica se há tema salvo
    const savedTheme = localStorage.getItem('theme') || 'light';
    root.setAttribute('data-theme', savedTheme);
    toggleButton.setAttribute('data-theme', savedTheme);

    // Função para alternar o tema
    const toggleTheme = () => {
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        root.setAttribute('data-theme', newTheme);
        toggleButton.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // Atualiza o estilo das tarefas caras após a troca de tema
        atualizarEstiloTarefasCara();
    };

    // Adiciona evento de clique
    toggleButton.addEventListener('click', toggleTheme);
};
const atualizarEstiloTarefasCara = () => {
    const root = document.documentElement;
    const isDarkMode = root.getAttribute('data-theme') === 'dark';
    const tarefasCaras = document.querySelectorAll('.tarefa-cara');

    tarefasCaras.forEach((tarefaItem) => {
        if (isDarkMode) {
            tarefaItem.style.backgroundColor = '#4b2e83'; // Cor de fundo roxa para tema escuro
            tarefaItem.querySelector('.tarefa-info strong').style.color = '#ff6b6b'; // Cor do texto vermelha
        } else {
            tarefaItem.style.backgroundColor = '#fff9e6'; // Cor de fundo amarela para tema claro
            tarefaItem.querySelector('.tarefa-info strong').style.color = '#d58500'; // Cor do texto mais escura
        }
    });
};

// Adicione ao evento DOMContentLoaded existente
document.addEventListener('DOMContentLoaded', () => {

    initTheme(); // Inicializa o tema
});
const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR');
};

const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
    }).format(valor);
};

// Sistema de notificações
const mostrarNotificacao = (mensagem, tipo = 'success') => {
    const toast = document.getElementById('toast');
    toast.textContent = mensagem;
    toast.className = `toast ${tipo}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
};

// Gerenciamento de tarefas
const carregarTarefas = async () => {
    try {
        const response = await fetch('/api/tarefas');
        const tarefas = await response.json();
        const container = document.getElementById('tarefas');
        container.innerHTML = '';

        if (tarefas.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>Nenhuma tarefa cadastrada</p>
                </div>
            `;
            return;
        }

        tarefas.forEach((tarefa, index) => {
            const tarefaElement = document.createElement('div');
            tarefaElement.className = `tarefa-item ${parseFloat(tarefa.custo) >= 1000 ? 'tarefa-cara' : ''}`;
            tarefaElement.dataset.id = tarefa.id;
            tarefaElement.dataset.ordem = tarefa.ordem;
            
            const dataLimite = new Date(tarefa.data_limite);
            const hoje = new Date();
            const diasRestantes = Math.ceil((dataLimite - hoje) / (1000 * 60 * 60 * 24));
            
            tarefaElement.innerHTML = `
                <div class="tarefa-ordem">
                    <button onclick="moverTarefa(${tarefa.id}, 'cima')" 
                            ${index === 0 ? 'disabled' : ''} 
                            title="Mover para cima">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                    <button onclick="moverTarefa(${tarefa.id}, 'baixo')" 
                            ${index === tarefas.length - 1 ? 'disabled' : ''} 
                            title="Mover para baixo">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                <div class="tarefa-info">
                    <strong>${tarefa.nome}</strong>
                    <div class="tarefa-detalhes">
                        <span title="Custo">
                            <i class="fas fa-coins"></i> ${formatarMoeda(tarefa.custo)}
                        </span>
                        <span title="Data Limite">
                            <i class="fas fa-calendar"></i> ${formatarData(tarefa.data_limite)}
                            (${diasRestantes > 0 ? `Faltam ${diasRestantes} dias` : 'Vencida'})
                        </span>
                    </div>
                </div>
                <div class="tarefa-acoes">
                    <button onclick="editarTarefa(${tarefa.id})" class="btn-primary" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="excluirTarefa(${tarefa.id})" class="btn-danger" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            // Adiciona estilos diferentes para tarefas com custo >= R$1.000,00
            if (parseFloat(tarefa.custo) >= 1000) {
                const root = document.documentElement;
                const isDarkMode = root.getAttribute('data-theme') === 'dark';
                
                tarefaElement.classList.add('tarefa-cara');
                
                if (isDarkMode) {
                    tarefaElement.style.backgroundColor = '#4b2e83'; // Cor de fundo roxa para tema escuro
                    tarefaElement.querySelector('.tarefa-info strong').style.color = '#ff6b6b'; // Cor do texto vermelha
                } else {
                    tarefaElement.style.backgroundColor = '#fff9e6'; // Cor de fundo amarela para tema claro
                    tarefaElement.querySelector('.tarefa-info strong').style.color = '#d58500'; // Cor do texto mais escura
                }
            }
            
            
            container.appendChild(tarefaElement);
        });
        atualizarEstiloTarefasCara();
    } catch (error) {
        console.error('Erro ao carregar tarefas:', error);
        mostrarNotificacao('Erro ao carregar tarefas', 'error');
    }
};

const moverTarefa = async (id, direcao) => {
    try {
        const response = await fetch('/api/tarefas/mover', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id, direcao })
        });
    
        if (response.ok) {
            await carregarTarefas();
        } else {
            throw new Error('Erro ao mover tarefa');
        }
    } catch (error) {
        console.error('Erro ao mover tarefa:', error);
        mostrarNotificacao('Erro ao mover tarefa', 'error');
    }
    };

const adicionarTarefa = async (event) => {
event.preventDefault();

const form = event.target;
const formData = new FormData(form);

const novaTarefa = {
    nome: document.getElementById('nome').value.trim().replace(/[^a-zA-Z0-9\s]/g,''),
    custo: document.getElementById('custo').value,
    data_limite: document.getElementById('data_limite').value
};

if (!novaTarefa.nome) {
    mostrarNotificacao('O nome da tarefa é obrigatório', 'error');
    return;
}

try {
    const response = await fetch('/api/tarefas', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(novaTarefa)
    });

    const data = await response.json();

    if (response.ok) {
        form.reset();
        await carregarTarefas();
        mostrarNotificacao('Tarefa adicionada com sucesso');
    } else {
        mostrarNotificacao(data.error || 'Erro ao adicionar tarefa', 'error');
    }
} catch (error) {
    console.error('Erro ao adicionar tarefa:', error);
    mostrarNotificacao('Erro ao adicionar tarefa', 'error');
}
};

const editarTarefa = async (id) => {
try {
    const response = await fetch(`/api/tarefas/${id}`);
    const tarefa = await response.json();
    
    const tarefaElement = document.querySelector(`[data-id="${id}"]`);
    const tarefaInfo = tarefaElement.querySelector('.tarefa-info');
    
    tarefaElement.classList.add('editando');
    tarefaInfo.innerHTML = `
        <div class="form-group">
            <label for="edit-nome-${id}">Nome</label>
            <input type="text" id="edit-nome-${id}" value="${tarefa.nome}" required>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="edit-custo-${id}">Custo</label>
                <div class="input-wrapper">
                    <span class="currency-symbol">R$</span>
                    <input type="number" id="edit-custo-${id}" value="${tarefa.custo}" step="0.01" required>
                </div>
            </div>
            <div class="form-group">
                <label for="edit-data-${id}">Data Limite</label>
                <input type="date" id="edit-data-${id}" value="${tarefa.data_limite}" required>
            </div>
        </div>
        <div class="form-actions">
            <button onclick="salvarEdicao(${id})" class="btn-primary">
                <i class="fas fa-save"></i> Salvar
            </button>
            <button onclick="carregarTarefas()" class="btn-secondary">
                <i class="fas fa-times"></i> Cancelar
            </button>
        </div>
    `;
} catch (error) {
    console.error('Erro ao editar tarefa:', error);
    mostrarNotificacao('Erro ao editar tarefa', 'error');
}
};

const salvarEdicao = async (id) => {
const dadosAtualizados = {
    nome: document.getElementById(`edit-nome-${id}`).value.trim(),
    custo: document.getElementById(`edit-custo-${id}`).value,
    data_limite: document.getElementById(`edit-data-${id}`).value
};

if (!dadosAtualizados.nome) {
    mostrarNotificacao('O nome da tarefa é obrigatório', 'error');
    return;
}

try {
    const response = await fetch(`/api/tarefas/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosAtualizados)
    });

    const data = await response.json();

    if (response.ok) {
        await carregarTarefas();
        mostrarNotificacao('Tarefa atualizada com sucesso');
    } else {
        mostrarNotificacao(data.error || 'Erro ao atualizar tarefa', 'error');
    }
} catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    mostrarNotificacao('Erro ao atualizar tarefa', 'error');
}
};

// Funções do modal de confirmação
let tarefaIdParaExcluir = null;

const mostrarModalConfirmacao = (id) => {
tarefaIdParaExcluir = id;
const modal = document.getElementById('confirmacaoModal');
const tarefa = document.querySelector(`[data-id="${id}"]`);
const nomeTarefa = tarefa.querySelector('.tarefa-info strong').textContent;

modal.querySelector('.task-to-delete').textContent = `"${nomeTarefa}"`;
modal.style.display = 'block';

// Foca no botão cancelar por segurança
document.getElementById('cancelarExclusao').focus();
};

const fecharModal = () => {
const modal = document.getElementById('confirmacaoModal');
modal.style.display = 'none';
tarefaIdParaExcluir = null;
};

const confirmarExclusao = async () => {
if (!tarefaIdParaExcluir) return;

try {
    const response = await fetch(`/api/tarefas/${tarefaIdParaExcluir}`, {
        method: 'DELETE'
    });

    if (response.ok) {
        fecharModal();
        await carregarTarefas();
        mostrarNotificacao('Tarefa excluída com sucesso');
    } else {
        throw new Error('Erro ao excluir tarefa');
    }
} catch (error) {
    console.error('Erro ao excluir tarefa:', error);
    mostrarNotificacao('Erro ao excluir tarefa', 'error');
}
};

const excluirTarefa = (id) => {
mostrarModalConfirmacao(id);
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
carregarTarefas();

const form = document.getElementById('tarefaForm');
if (form) {
    form.addEventListener('submit', adicionarTarefa);
}


// Modal events
document.getElementById('confirmarExclusao').addEventListener('click', confirmarExclusao);
document.getElementById('cancelarExclusao').addEventListener('click', fecharModal);

// Fechar modal ao clicar fora dele
window.addEventListener('click', (event) => {
    const modal = document.getElementById('confirmacaoModal');
    if (event.target === modal) {
        fecharModal();
    }
});

// Atalhos de teclado
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('confirmacaoModal').style.display === 'block') {
        fecharModal();
    }
});
});

// Definir data mínima no input de data
document.addEventListener('DOMContentLoaded', () => {
const hoje = new Date().toISOString().split('T')[0];
document.getElementById('data_limite').min = hoje;
}); 