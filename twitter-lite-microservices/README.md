Ejecutar en client, tweets y users
npm init
npm install

Generar la imagen del microservicio
docker build -t users .

Con docker compose no hace falta hacer build de los docker user y tweets individualmente:
docker-compose up

ver logs
docker logs users 
docker logs tweets

