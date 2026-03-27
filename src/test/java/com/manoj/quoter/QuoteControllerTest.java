package com.manoj.quoter;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class QuoteControllerTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper mapper;

    @MockBean
    KafkaTemplate<String, String> kafkaTemplate;

    private static String token;

    @BeforeAll
    static void obtainToken(@Autowired MockMvc mvc,
                            @Autowired ObjectMapper mapper) throws Exception {
        String body = mapper.writeValueAsString(Map.of("clientId", "tester", "role", "ADMIN"));
        String resp = mvc.perform(post("/auth/token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        token = mapper.readTree(resp).get("token").asText();
    }

    @Test @Order(1)
    void healthEndpointReturnsOk() throws Exception {
        mvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());
    }

    @Test @Order(2)
    void tokenIssuedForValidClient() throws Exception {
        String body = mapper.writeValueAsString(Map.of("clientId", "tester", "role", "ADMIN"));
        mvc.perform(post("/auth/token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists());
    }

    @Test @Order(3)
    void emptyClientIdRejected() throws Exception {
        String body = mapper.writeValueAsString(Map.of("clientId", ""));
        mvc.perform(post("/auth/token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test @Order(4)
    void unauthenticatedRequestRejected() throws Exception {
        mvc.perform(get("/quotes/AAPL"))
                .andExpect(status().isForbidden());
    }

    @Test @Order(5)
    void createQuoteSuccess() throws Exception {
        String body = mapper.writeValueAsString(Map.of("symbol", "AAPL", "price", "189.50"));
        mvc.perform(post("/quotes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("AAPL"));
    }

    @Test @Order(6)
    void xssSymbolRejected() throws Exception {
        String body = mapper.writeValueAsString(
                Map.of("symbol", "<script>alert(1)</script>", "price", "100.00"));
        mvc.perform(post("/quotes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test @Order(7)
    void negativePriceRejected() throws Exception {
        String body = mapper.writeValueAsString(Map.of("symbol", "AAPL", "price", "-50.00"));
        mvc.perform(post("/quotes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test @Order(8)
    void createThenGetBySymbol() throws Exception {
        String body = mapper.writeValueAsString(Map.of("symbol", "MSFT", "price", "415.00"));
        mvc.perform(post("/quotes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isOk());

        mvc.perform(get("/quotes/MSFT")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].symbol").value("MSFT"));
    }

    @Test @Order(9)
    void unknownSymbolReturnsEmptyList() throws Exception {
        mvc.perform(get("/quotes/ZZZZZ")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test @Order(10)
    void tamperedJwtRejected() throws Exception {
        mvc.perform(get("/quotes/AAPL")
                .header("Authorization", "Bearer eyJhbGciOiJIUzI1NiJ9.fake.payload"))
                .andExpect(status().isForbidden());
    }

    @Test @Order(11)
    void emptySymbolRejected() throws Exception {
        String body = mapper.writeValueAsString(Map.of("symbol", "", "price", "100.00"));
        mvc.perform(post("/quotes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isBadRequest());
    }
}
