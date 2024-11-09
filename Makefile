build:
	docker build -t nft_infec .

run:
	docker run --rm  --name infec -p 8080:8080 nft_infec:latest

shell:
	docker exec -it infec sh