install:
	@pip install poetry
	@poetry install

run:
	@poetry run python manage.py runserver
	
format:
	@poetry run isort . --profile black
	@poetry run black .

lint:
	@poetry run isort --check --profile black .
	@poetry run black --check .

test:
	@poetry run python manage.py test

admin:
	@poetry run python manage.py createsuperuser
