# =============================================================================
# IASTECH P&ID Lens — Makefile de Operação
# =============================================================================
# Comandos rápidos de automação para clientes e operadores do sistema
# Uso: make <alvo>
# =============================================================================

.PHONY: help install dev demo build clean

.DEFAULT_GOAL := help

# Cores do terminal
CYAN  := \033[36m
WHITE := \033[37m
RESET := \033[0m

## help: Exibe os comandos operacionais disponíveis
help:
	@echo ""
	@echo "$(CYAN)IASTECH P&ID Lens — Comandos de Operação$(RESET)"
	@echo "============================================================"
	@echo "  $(CYAN)install$(RESET)   Instala as dependências da aplicação"
	@echo "  $(CYAN)dev$(RESET)       Inicia o servidor da aplicação na porta 3000"
	@echo "  $(CYAN)demo$(RESET)      Executa a demonstração rápida no Windows (demo.bat)"
	@echo "  $(CYAN)build$(RESET)     Gera o pacote de produção otimizado"
	@echo "  $(CYAN)clean$(RESET)     Remove caches de compilação"
	@echo ""

## install: Instala as dependências da aplicação
install:
	npm install

## dev: Inicia a aplicação web local
dev:
	npm run dev

## demo: Executa a demonstração executiva
demo:
	cmd /c demo.bat

## build: Compila a aplicação para produção
build:
	npm run build

## clean: Remove arquivos de cache
clean:
	rm -rf dist .next
