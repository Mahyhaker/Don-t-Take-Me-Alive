# app.py
# Importação das bibliotecas necessárias
from flask import Flask, send_from_directory, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from datetime import datetime
import os

# Inicialização do aplicativo Flask e configuração do banco de dados
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tarefas.db'
db = SQLAlchemy(app)

# Definição do modelo de dados para Tarefas
class Tarefa(db.Model):
    __tablename__ = 'tarefas'
    # Definição dos campos da tabela
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    custo = db.Column(db.Float, nullable=False)
    data_limite = db.Column(db.Date, nullable=False)
    ordem = db.Column(db.Integer, nullable=False)

    # Método para converter objeto Tarefa em dicionário
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'custo': self.custo,
            'data_limite': self.data_limite.strftime('%Y-%m-%d'),
            'ordem': self.ordem
        }

# Contexto do aplicativo para inicialização do banco
with app.app_context():
    # Recria o banco de dados a cada inicialização
    db.drop_all()
    db.create_all()

# Rota principal que serve o arquivo HTML
@app.route('/')
def home():
    with open('index.html', 'r', encoding='utf-8') as file:
        content = file.read()
    return content

# Rotas para servir arquivos estáticos
@app.route('/style.css')
def serve_css():
    return send_from_directory('.', 'style.css'), 200, {'Content-Type': 'text/css'}

@app.route('/script.js')
def serve_js():
    return send_from_directory('.', 'script.js'), 200, {'Content-Type': 'application/javascript'}

# API Endpoints para manipulação de tarefas

# GET - Lista todas as tarefas ordenadas
@app.route('/api/tarefas', methods=['GET'])
def listar_tarefas():
    tarefas = Tarefa.query.order_by(Tarefa.ordem).all()
    return jsonify([tarefa.to_dict() for tarefa in tarefas])

# GET - Obtém uma tarefa específica por ID
@app.route('/api/tarefas/<int:id>', methods=['GET'])
def obter_tarefa(id):
    tarefa = Tarefa.query.get_or_404(id)
    return jsonify(tarefa.to_dict())

# POST - Cria uma nova tarefa
@app.route('/api/tarefas', methods=['POST'])
def criar_tarefa():
    dados = request.json
    
    # Verifica duplicidade de nome
    tarefa_existente = Tarefa.query.filter_by(nome=dados['nome']).first()
    if tarefa_existente:
        return jsonify({'error': 'Já existe uma tarefa com este nome'}), 400
    
    # Calcula próxima ordem disponível
    ultima_ordem = db.session.query(db.func.max(Tarefa.ordem)).scalar()
    proxima_ordem = 1 if ultima_ordem is None else ultima_ordem + 1
    
    # Cria nova tarefa
    nova_tarefa = Tarefa(
        nome=dados['nome'],
        custo=float(dados['custo']),
        data_limite=datetime.strptime(dados['data_limite'], '%Y-%m-%d'),
        ordem=proxima_ordem
    )
    
    db.session.add(nova_tarefa)
    db.session.commit()
    
    return jsonify(nova_tarefa.to_dict())

# PUT - Atualiza uma tarefa existente
@app.route('/api/tarefas/<int:id>', methods=['PUT'])
def atualizar_tarefa(id):
    tarefa = Tarefa.query.get_or_404(id)
    dados = request.json
    
    # Verifica duplicidade de nome
    tarefa_existente = Tarefa.query.filter(
        Tarefa.nome == dados['nome'], 
        Tarefa.id != id
    ).first()
    
    if tarefa_existente:
        return jsonify({'error': 'Já existe uma tarefa com este nome'}), 400
    
    # Atualiza os dados da tarefa
    tarefa.nome = dados['nome']
    tarefa.custo = float(dados['custo'])
    tarefa.data_limite = datetime.strptime(dados['data_limite'], '%Y-%m-%d')
    
    db.session.commit()
    return jsonify(tarefa.to_dict())

# DELETE - Remove uma tarefa
@app.route('/api/tarefas/<int:id>', methods=['DELETE'])
def deletar_tarefa(id):
    tarefa = Tarefa.query.get_or_404(id)
    db.session.delete(tarefa)
    db.session.commit()
    return '', 204

# POST - Altera a ordem das tarefas (move para cima ou para baixo) pain
@app.route('/api/tarefas/mover', methods=['POST'])
def mover_tarefa():
    try:
        # Validação dos dados recebidos
        if not request.json or 'id' not in request.json or 'direcao' not in request.json:
            return jsonify({'error': 'Dados inválidos'}), 400

        dados = request.json
        tarefa_id = dados['id']
        direcao = dados['direcao']
        
        # Validação da direção do movimento
        if direcao not in ['cima', 'baixo']:
            return jsonify({'error': 'Direção inválida'}), 400
        
        # Busca tarefas ordenadas
        tarefas = Tarefa.query.order_by(Tarefa.ordem).all()
        
        # Encontra posição atual da tarefa
        indice_atual = next(
            (i for i, t in enumerate(tarefas) if t.id == tarefa_id), 
            None
        )
        
        if indice_atual is None:
            return jsonify({'error': 'Tarefa não encontrada na lista ordenada'}), 404
        
        # Movimento para cima
        if direcao == 'cima' and indice_atual > 0:
            tarefa_atual = tarefas[indice_atual]
            tarefa_anterior = tarefas[indice_atual - 1]
            
            # Troca de ordens
            temp_ordem = tarefa_atual.ordem
            tarefa_atual.ordem = tarefa_anterior.ordem
            tarefa_anterior.ordem = temp_ordem
        
        # Movimento para baixo
        elif direcao == 'baixo' and indice_atual < len(tarefas) - 1:
            tarefa_atual = tarefas[indice_atual]
            proxima_tarefa = tarefas[indice_atual + 1]
            
            # Troca de ordens
            temp_ordem = tarefa_atual.ordem
            tarefa_atual.ordem = proxima_tarefa.ordem
            proxima_tarefa.ordem = temp_ordem
        
        # Salva alterações
        db.session.commit()
        
        return jsonify({'message': 'Ordem atualizada com sucesso'})
    
    except Exception as e:
        # Rollback em caso de erro
        db.session.rollback()
        print(f"Erro ao mover tarefa: {e}")
        return jsonify({'error': 'Erro interno do servidor', 'details': str(e)}), 500

# Inicia o servidor em modo debug
if __name__ == '__main__':
    app.run(debug=True)