package com.ecotrace.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
public class AiServiceConfig {

    @ConfigurationProperties(prefix = "app.ai-service")
    public record AiServiceProperties(
            String url,
            Duration timeout,
            boolean enabled
    ) {
        public AiServiceProperties {
            if (url == null || url.isBlank()) url = "http://localhost:8001";
            if (timeout == null) timeout = Duration.ofSeconds(60);
        }
    }

    @Bean
    public RestClient aiRestClient(AiServiceProperties props) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(props.timeout());
        factory.setReadTimeout(props.timeout());

        return RestClient.builder()
                .baseUrl(props.url())
                .requestFactory(factory)
                .build();
    }
}

