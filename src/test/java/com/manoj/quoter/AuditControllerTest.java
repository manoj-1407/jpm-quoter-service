package com.manoj.quoter;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@org.springframework.context.annotation.Import(TestRedisConfig.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuditControllerTest {

    @Autowired MockMvc      mvc;
    @Autowired ObjectMapper mapper;
    @MockBean  PriceEventProducer priceEventProducer;

    private String adminBearer;
    private String userBearer;

    @BeforeEach
    void getTokens() throws Exception {
        adminBearer = "Bearer " + token("ci-admin", "ADMIN");
        userBearer  = "Bearer " + token("ci-user",  "USER");
    }

    private String token(String clientId, String role) throws Exception {
        MvcResult res = mvc.perform(post("/auth/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(
                                Map.of("clientId", clientId, "role", role))))
                .andExpect(status().isOk())
                .andReturn();
        return mapper.readTree(res.getResponse().getContentAsString())
                     .get("token").asText();
    }

    @Test
    void adminCanListAuditLog() throws Exception {
        mvc.perform(get("/audit").header("Authorization", adminBearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.pageable").exists());
    }

    @Test
    void unauthenticatedIsRejected() throws Exception {
        mvc.perform(get("/audit")).andExpect(status().isForbidden());
    }

    @Test
    void nonAdminUserIsForbidden() throws Exception {
        mvc.perform(get("/audit").header("Authorization", userBearer))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanFilterByClientId() throws Exception {
        mvc.perform(get("/audit?clientId=ci-admin").header("Authorization", adminBearer))
                .andExpect(status().isOk());
    }

    @Test
    void adminCanFilterByAction() throws Exception {
        mvc.perform(get("/audit?action=QUOTE_CREATE").header("Authorization", adminBearer))
                .andExpect(status().isOk());
    }

    @Test
    void pageSizeCappedAt200() throws Exception {
        mvc.perform(get("/audit?size=999").header("Authorization", adminBearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(200));
    }
}
