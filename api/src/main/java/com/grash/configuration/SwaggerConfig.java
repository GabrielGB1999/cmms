package com.grash.configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
public class SwaggerConfig {

    @Bean
    public GroupedOpenApi publicApi() {
        return GroupedOpenApi.builder()
                .group("atlas-cmms")
                .pathsToMatch("/**")
                .build();
    }

    // Update mappers write null for every field not sent (the web app always sends whole records,
    // and clears a field by sending null), so API clients must be told PATCH is not partial.
    @Bean
    public OpenAPI apiInfo() {
        return new OpenAPI().info(new Info().title("Atlas CMMS API").description(
                "**PATCH replaces the whole record.** Fields you leave out are saved as empty, not kept. " +
                        "To change one field, GET the record, change the field, and PATCH the full object back. " +
                        "Send a field as null to clear it."));
    }
}
