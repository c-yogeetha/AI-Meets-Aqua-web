.PHONY: all setup dev test verify build report seed backup-demo restore-demo clean

all: verify

setup:
	@echo "Setting up backend venv and dependencies..."
	python3 -m venv backend/.venv
	backend/.venv/bin/pip install --upgrade pip
	backend/.venv/bin/pip install -r backend/requirements.txt
	@echo "Setting up frontend dependencies..."
	cd frontend && npm install

dev:
	./scripts/dev.sh

test:
	@echo "Running backend tests..."
	cd backend && source .venv/bin/activate && pytest -q
	@echo "Running frontend E2E tests..."
	cd frontend && npx playwright test

verify:
	./scripts/verify_all.sh

build:
	@echo "Building frontend static assets..."
	cd frontend && npm run build

report:
	python scripts/build_test_report.py

seed:
	@echo "Seeding demo tank and analysis results..."
	curl -s -X POST http://localhost:8000/api/v1/demo/seed | jq . || curl -s -X POST http://localhost:8000/api/v1/demo/seed

backup-demo:
	@echo "Backing up demo database and artifacts..."
	zip -r demo-data-backup.zip backend/data
	@echo "Backup saved to demo-data-backup.zip"

restore-demo:
	@if [ -f demo-data-backup.zip ]; then \
		echo "Restoring demo data from demo-data-backup.zip..."; \
		unzip -o demo-data-backup.zip; \
		echo "Restore complete."; \
	else \
		echo "Error: demo-data-backup.zip not found!"; exit 1; \
	fi

clean:
	rm -rf backend/data test-results frontend/public/test-results.json
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
