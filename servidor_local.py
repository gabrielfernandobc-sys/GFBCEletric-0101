# -*- coding: utf-8 -*-
"""
Servidor Web Local para PRO-ELÉTRICA CAD NBR 5410
Permite abrir a aplicação em qualquer navegador na rede local (Wi-Fi / LAN)
e gerencia o salvamento/carregamento direto de projetos na pasta 'projetos/'.
"""

import os
import sys
import json
import socket
import datetime
import subprocess
import http.server
import ipaddress
import argparse
import tempfile
import shutil
from urllib.parse import unquote, parse_qs, urlparse

# Configura codificação do console para UTF-8 de forma segura
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PORTA_PADRAO = 8080
DIRETORIO_BASE = os.path.dirname(os.path.abspath(__file__))
PASTA_PROJETOS = os.path.join(DIRETORIO_BASE, 'projetos')
PASTA_LIXEIRA = os.path.join(PASTA_PROJETOS, 'lixeira')

# Tamanho máximo aceito no corpo de uma requisição POST (projetos grandes com várias plantas)
TAMANHO_MAX_CORPO = 50 * 1024 * 1024  # 50 MB

# Apenas estes tipos de arquivo podem ser servidos como conteúdo estático.
# Evita expor .git/, scripts .py/.bat e outros arquivos da pasta do aplicativo.
EXTENSOES_ESTATICAS = {
    '.html', '.js', '.css', '.json', '.png', '.svg', '.ico', '.jpg', '.jpeg',
    '.webp', '.woff', '.woff2', '.ttf', '.webmanifest', '.txt'
}

os.makedirs(PASTA_PROJETOS, exist_ok=True)

def obter_ips_locais():
    ips = []
    try:
        nome_host = socket.gethostname()
        for ip in socket.gethostbyname_ex(nome_host)[2]:
            if not ip.startswith('127.') and not ip.startswith('169.254.'):
                ips.append(ip)
    except Exception:
        pass
    
    if not ips:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ips.append(s.getsockname()[0])
            s.close()
        except Exception:
            ips.append("127.0.0.1")
    return list(dict.fromkeys(ips))

def desenhar_banner(ip_principal, porta, somente_local=False):
    url_local = f"http://localhost:{porta}"
    url_rede = f"http://{ip_principal}:{porta}"

    print("\n" + "=" * 70)
    print("   [+] PRO-ELÉTRICA CAD NBR 5410 - SERVIDOR WEB ATIVO COM PASTA DE PROJETOS")
    print("=" * 70)
    print("\n  O software esta pronto para ser aberto em QUALQUER dispositivo!")
    print(f"\n  >> PASTA DE PROJETOS SALVOS:\n     {PASTA_PROJETOS}")
    if somente_local:
        print("\n  >> MODO SOMENTE LOCAL: acesso pela rede/celular desativado.")
    else:
        print("\n  >> NO CELULAR OU TABLET (Conectado ao mesmo Wi-Fi):")
        print(f"     URL: {url_rede}")
        print("     (Use apenas em redes confiáveis. Para bloquear a rede: --somente-local)")
    print("\n  >> NESTE COMPUTADOR:")
    print(f"     URL: {url_local}")
    print("\n" + "-" * 70)
    print("  [Pressione CTRL + C para encerrar o servidor]")
    print("=" * 70 + "\n")

def sanitizar_nome_arquivo(nome):
    if not nome:
        nome = "projeto"
    # Remove caracteres inválidos para nomes de arquivos
    caracteres_validos = "-_.() abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789áàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ"
    nome_limpo = "".join(c for c in nome if c in caracteres_validos).strip()
    if not nome_limpo:
        nome_limpo = "projeto"
    if not nome_limpo.lower().endswith('.proeletrica'):
        nome_limpo += '.proeletrica'
    return nome_limpo

def host_permitido(host_header):
    """Aceita apenas acessos por IP, 'localhost' ou pelo nome deste computador.
    Bloqueia ataques de DNS rebinding (um site externo apontando seu domínio para este IP)."""
    if not host_header:
        return False
    host = host_header.strip()
    if host.startswith('['):  # IPv6 com porta: [::1]:8080
        host = host[1:host.find(']')] if ']' in host else host
    else:
        host = host.rsplit(':', 1)[0] if host.count(':') == 1 else host
    host = host.lower().rstrip('.')
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        pass
    nome_pc = socket.gethostname().lower()
    return host in ('localhost', nome_pc, nome_pc + '.local', nome_pc + '.lan')


def gravar_json_atomico(caminho, dados):
    """Grava em arquivo temporário e só então substitui o original,
    mantendo uma cópia .bak da versão anterior. Evita arquivo corrompido
    se o computador desligar ou a gravação falhar no meio."""
    pasta = os.path.dirname(caminho)
    fd, tmp = tempfile.mkstemp(dir=pasta, prefix='.salvando_', suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(dados, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        if os.path.exists(caminho):
            shutil.copy2(caminho, caminho + '.bak')
        os.replace(tmp, caminho)
    except Exception:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise


class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Sem CORS liberado: o próprio app sempre chama a API pela mesma origem.
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def requisicao_e_local(self):
        try:
            return ipaddress.ip_address(self.client_address[0]).is_loopback
        except ValueError:
            return False

    def validar_origem(self):
        """Recusa requisições vindas de outros sites (CSRF) e Hosts desconhecidos.
        Retorna True se a requisição pode prosseguir; caso contrário já respondeu 403."""
        host = self.headers.get('Host', '')
        if not host_permitido(host):
            self.responder_json(403, {'sucesso': False, 'erro': 'Host não permitido.'})
            return False
        origem = self.headers.get('Origin')
        if origem and origem != 'null':
            if urlparse(origem).netloc.lower() != host.lower():
                self.responder_json(403, {'sucesso': False, 'erro': 'Origem não permitida.'})
                return False
        return True

    def do_OPTIONS(self):
        # Nenhuma rota precisa de preflight CORS, pois o app é servido pela mesma origem.
        self.send_response(403)
        self.end_headers()

    def responder_json(self, status, dados):
        corpo = json.dumps(dados, ensure_ascii=False, indent=2).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def do_GET(self):
        if not self.validar_origem():
            return
        parsed = urlparse(self.path)
        caminho = unquote(parsed.path)

        # Rota de status do servidor e pasta
        if caminho == '/api/status':
            self.responder_json(200, {
                'status': 'online',
                'pasta_projetos': PASTA_PROJETOS,
                'total_projetos': len([f for f in os.listdir(PASTA_PROJETOS) if f.lower().endswith('.proeletrica')])
            })
            return

        # Rota para listar arquivos salvos na pasta 'projetos'
        if caminho == '/api/projetos':
            try:
                arquivos = []
                for f in os.listdir(PASTA_PROJETOS):
                    if f.lower().endswith('.proeletrica'):
                        caminho_completo = os.path.join(PASTA_PROJETOS, f)
                        stats = os.stat(caminho_completo)
                        mod_dt = datetime.datetime.fromtimestamp(stats.st_mtime)
                        
                        nome_projeto = f[:-12]
                        resumo = {}
                        try:
                            with open(caminho_completo, 'r', encoding='utf-8') as arq_json:
                                dados = json.load(arq_json)
                                if 'projeto' in dados and isinstance(dados['projeto'], dict):
                                    nome_projeto = dados['projeto'].get('nome', nome_projeto)
                                if 'estado' in dados and isinstance(dados['estado'], dict):
                                    est = dados['estado']
                                    resumo = {
                                        'pavimentos': len(est.get('pavimentos', [])),
                                        'comodos': len(est.get('comodos', [])),
                                        'pontos': len(est.get('pontosEletricos', []))
                                    }
                        except Exception:
                            pass

                        arquivos.append({
                            'arquivo': f,
                            'nome': nome_projeto,
                            'tamanho_bytes': stats.st_size,
                            'modificado_em': mod_dt.strftime('%d/%m/%Y %H:%M:%S'),
                            'timestamp': stats.st_mtime,
                            'resumo': resumo
                        })
                
                # Ordena pelos mais recentes primeiro
                arquivos.sort(key=lambda x: x['timestamp'], reverse=True)
                self.responder_json(200, {'sucesso': True, 'projetos': arquivos, 'pasta': PASTA_PROJETOS})
            except Exception as e:
                self.responder_json(500, {'sucesso': False, 'erro': str(e)})
            return

        # Rota para carregar um projeto específico da pasta 'projetos'
        if caminho == '/api/projetos/carregar':
            params = parse_qs(parsed.query)
            nome_arq = params.get('arquivo', [''])[0]
            nome_arq = os.path.basename(nome_arq) # Evita path traversal

            caminho_completo = os.path.join(PASTA_PROJETOS, nome_arq)
            if not nome_arq.lower().endswith('.proeletrica') or not os.path.isfile(caminho_completo):
                self.responder_json(404, {'sucesso': False, 'erro': 'Arquivo de projeto não encontrado.'})
                return

            try:
                with open(caminho_completo, 'r', encoding='utf-8') as f:
                    dados = json.load(f)
                self.responder_json(200, {'sucesso': True, 'arquivo': nome_arq, 'dados': dados})
            except Exception as e:
                self.responder_json(500, {'sucesso': False, 'erro': f'Erro ao ler arquivo: {str(e)}'})
            return

        # Rota padrão para página inicial
        if caminho in ('/', ''):
            self.path = '/index.html'
            caminho = '/index.html'

        # Arquivos estáticos: bloqueia pastas/arquivos ocultos (.git, .env), a pasta
        # de projetos (acessível apenas pela API), as pastas de desenvolvimento
        # (node_modules, scripts, testes) e extensões fora da lista permitida.
        partes = [p for p in caminho.split('/') if p]
        ext = os.path.splitext(caminho)[1].lower()
        if (any(p.startswith('.') for p in partes)
                or (partes and partes[0] in ('projetos', 'node_modules', 'scripts', 'testes'))
                or ext not in EXTENSOES_ESTATICAS):
            self.send_error(404, 'Arquivo não encontrado')
            return

        super().do_GET()

    def do_HEAD(self):
        self.send_error(405)

    def do_POST(self):
        if not self.validar_origem():
            return
        parsed = urlparse(self.path)
        caminho = unquote(parsed.path)

        try:
            length = int(self.headers.get('Content-Length', 0))
        except ValueError:
            self.responder_json(400, {'sucesso': False, 'erro': 'Content-Length inválido.'})
            return
        if length > TAMANHO_MAX_CORPO:
            self.responder_json(413, {'sucesso': False, 'erro': 'Projeto excede o tamanho máximo de 50 MB.'})
            return
        try:
            corpo_raw = self.rfile.read(length).decode('utf-8') if length > 0 else '{}'
        except UnicodeDecodeError:
            self.responder_json(400, {'sucesso': False, 'erro': 'Corpo da requisição não está em UTF-8.'})
            return

        # Salvar projeto diretamente na pasta 'projetos/'
        if caminho == '/api/projetos/salvar':
            try:
                payload = json.loads(corpo_raw)
                if not isinstance(payload, dict):
                    self.responder_json(400, {'sucesso': False, 'erro': 'Formato de projeto inválido.'})
                    return
                projeto_info = payload.get('projeto') if isinstance(payload.get('projeto'), dict) else {}
                nome_base = payload.get('nomeArquivo') or projeto_info.get('nome') or 'Projeto_Eletrico'
                if not isinstance(nome_base, str):
                    nome_base = 'Projeto_Eletrico'
                nome_arq = sanitizar_nome_arquivo(nome_base)
                
                caminho_arquivo = os.path.join(PASTA_PROJETOS, nome_arq)

                # Salva com formatação bonita e UTF-8 (gravação atômica + backup .bak)
                gravar_json_atomico(caminho_arquivo, payload)

                print(f"[+] Projeto salvo com sucesso: {caminho_arquivo}")
                self.responder_json(200, {
                    'sucesso': True,
                    'mensagem': f'Projeto gravado na pasta com sucesso!',
                    'arquivo': nome_arq,
                    'caminho': caminho_arquivo
                })
            except json.JSONDecodeError:
                self.responder_json(400, {'sucesso': False, 'erro': 'JSON do projeto inválido.'})
            except Exception as e:
                print(f"[-] Erro ao salvar projeto: {e}")
                self.responder_json(500, {'sucesso': False, 'erro': str(e)})
            return

        # Excluir projeto da pasta (move para projetos/lixeira, permitindo recuperar)
        if caminho == '/api/projetos/excluir':
            try:
                payload = json.loads(corpo_raw)
                nome_arq = os.path.basename(str(payload.get('arquivo', '')))
                caminho_completo = os.path.join(PASTA_PROJETOS, nome_arq)
                if nome_arq.lower().endswith('.proeletrica') and os.path.isfile(caminho_completo):
                    os.makedirs(PASTA_LIXEIRA, exist_ok=True)
                    carimbo = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
                    destino = os.path.join(PASTA_LIXEIRA, f'{carimbo}_{nome_arq}')
                    os.replace(caminho_completo, destino)
                    if os.path.isfile(caminho_completo + '.bak'):
                        os.replace(caminho_completo + '.bak', destino + '.bak')
                    self.responder_json(200, {'sucesso': True, 'mensagem': f'Arquivo "{nome_arq}" movido para a lixeira (projetos/lixeira).'})
                else:
                    self.responder_json(404, {'sucesso': False, 'erro': 'Arquivo não encontrado.'})
            except Exception as e:
                self.responder_json(500, {'sucesso': False, 'erro': str(e)})
            return

        # Abrir a pasta 'projetos' no Explorador de Arquivos do Windows
        if caminho == '/api/projetos/abrir_pasta':
            # Só faz sentido (e só é seguro) a partir deste próprio computador
            if not self.requisicao_e_local():
                self.responder_json(403, {'sucesso': False, 'erro': 'Abrir a pasta só é permitido neste computador.'})
                return
            try:
                if sys.platform.startswith('win'):
                    os.startfile(PASTA_PROJETOS)
                elif sys.platform.startswith('darwin'):
                    subprocess.Popen(['open', PASTA_PROJETOS])
                else:
                    subprocess.Popen(['xdg-open', PASTA_PROJETOS])
                self.responder_json(200, {'sucesso': True, 'pasta': PASTA_PROJETOS})
            except Exception as e:
                self.responder_json(500, {'sucesso': False, 'erro': str(e)})
            return

        self.responder_json(404, {'sucesso': False, 'erro': 'Rota não encontrada'})

def main():
    parser = argparse.ArgumentParser(description='Servidor local do PRO-ELÉTRICA CAD NBR 5410')
    parser.add_argument('--porta', type=int, default=PORTA_PADRAO, help='Porta inicial (padrão: 8080)')
    parser.add_argument('--somente-local', action='store_true',
                        help='Aceita conexões apenas deste computador (desativa acesso pelo celular/rede)')
    args = parser.parse_args()

    diretorio = os.path.dirname(os.path.abspath(__file__))
    os.chdir(diretorio)

    endereco = '127.0.0.1' if args.somente_local else '0.0.0.0'
    ip_principal = '127.0.0.1'
    if not args.somente_local:
        ips = obter_ips_locais()
        ip_principal = ips[0] if ips else "127.0.0.1"

    porta = args.porta
    servidor = None

    http.server.ThreadingHTTPServer.allow_reuse_address = True
    http.server.ThreadingHTTPServer.daemon_threads = True
    for p in range(porta, porta + 10):
        try:
            servidor = http.server.ThreadingHTTPServer((endereco, p), CustomHandler)
            porta = p
            break
        except OSError:
            continue

    if not servidor:
        print(f"Erro: Nao foi possivel vincular o servidor as portas {porta}-{porta+9}")
        sys.exit(1)

    desenhar_banner(ip_principal, porta, args.somente_local)

    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor finalizado com sucesso.")
        servidor.server_close()

if __name__ == '__main__':
    main()
