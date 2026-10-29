package com.ecotrace;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class EcoTraceApplication {

    public static void main(String[] args) {
        SpringApplication.run(EcoTraceApplication.class, args);
    }
}

