FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/sistema-contable-backend-1.0.0.jar app.jar
EXPOSE 3000
ENTRYPOINT ["java", "-jar", "app.jar"]
