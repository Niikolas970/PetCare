package com.petcare.backend;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Prueba de integración: levanta el contexto completo, así que necesita MySQL en marcha
 * y las variables de entorno SPRING_DATASOURCE_PASSWORD (o DB_PASSWORD) y JWT_SECRET.
 *
 * Por eso está marcada con @Tag("integration") y Maven la excluye por defecto
 * (ver integration.tests.excluded en pom.xml). Para correrla:
 *   .\mvnw.cmd test "-Dintegration.tests.excluded=none"
 */
@Tag("integration")
@SpringBootTest
class BackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
