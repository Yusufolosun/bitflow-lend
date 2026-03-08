.PHONY: test deploy-testnet deploy-mainnet lint setup coverage dev-frontend build-frontend clean help

# Default target
.DEFAULT_GOAL := help

# Variables
FRONTEND_DIR := frontend
SCRIPTS_DIR := scripts

help:
	@echo "BitFlow Lend - Available Commands"
	@echo "===================================="
	@echo ""
	@echo "Development:"
	@echo "  make setup           - Set up development environment"
	@echo "  make dev-frontend    - Start frontend development server"
	@echo "  make build-frontend  - Build frontend for production"
	@echo ""
	@echo "Testing:"
	@echo "  make test            - Run all tests"
	@echo "  make coverage        - Check test coverage"
	@echo "  make lint            - Run all linters"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-testnet  - Deploy to testnet"
	@echo "  make deploy-mainnet  - Deploy to mainnet (requires confirmation)"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean           - Clean build artifacts"
	@echo "  make docker-build    - Build Docker image"
	@echo "  make docker-run      - Run Docker container"
	@echo ""

test:
	@echo "🧪 Running all tests..."
	@$(SCRIPTS_DIR)/run-tests.sh

lint:
	@echo "🔍 Running linters..."
	@$(SCRIPTS_DIR)/lint.sh

coverage:
	@echo "📊 Checking test coverage..."
	@$(SCRIPTS_DIR)/check-coverage.sh

setup:
	@echo "🔧 Setting up development environment..."
	@$(SCRIPTS_DIR)/setup-dev.sh

deploy-testnet:
	@echo "🚀 Deploying to testnet..."
	@$(SCRIPTS_DIR)/deploy-testnet.sh

deploy-mainnet:
	@echo "⚠️  Deploying to MAINNET..."
	@$(SCRIPTS_DIR)/deploy-mainnet.sh

dev-frontend:
	@echo "🎨 Starting frontend development server..."
	@cd $(FRONTEND_DIR) && npm run dev

build-frontend:
	@echo "📦 Building frontend for production..."
	@cd $(FRONTEND_DIR) && npm run build

install-frontend:
	@echo "📦 Installing frontend dependencies..."
	@cd $(FRONTEND_DIR) && npm install

clean:
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf $(FRONTEND_DIR)/dist
	@rm -rf $(FRONTEND_DIR)/node_modules
	@rm -rf $(FRONTEND_DIR)/.cache
	@rm -rf coverage
	@echo "✅ Clean complete!"

docker-build:
	@echo "🐳 Building Docker image..."
	@docker build -t bitflow-lend .

docker-run:
	@echo "🐳 Running Docker container..."
	@docker-compose up -d

docker-stop:
	@echo "🛑 Stopping Docker container..."
	@docker-compose down

docker-logs:
	@echo "📋 Showing Docker logs..."
	@docker-compose logs -f

# Check prerequisites
check-node:
	@command -v node >/dev/null 2>&1 || { echo "❌ Node.js is not installed"; exit 1; }
	@echo "✅ Node.js is installed"

check-clarinet:
	@command -v clarinet >/dev/null 2>&1 || { echo "❌ Clarinet is not installed"; exit 1; }
	@echo "✅ Clarinet is installed"

check-deps: check-node check-clarinet
	@echo "✅ All dependencies are installed"

# Run all checks before deployment
pre-deploy: lint test
	@echo "✅ All pre-deployment checks passed"
