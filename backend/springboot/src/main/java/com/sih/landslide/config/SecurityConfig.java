package com.sih.landslide.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService(PasswordEncoder encoder) {
        UserDetails admin = User.builder()
                .username("admin")
                .password(encoder.encode("admin123"))
                .roles("ADMIN")
                .build();

        UserDetails authority = User.builder()
                .username("authority")
                .password(encoder.encode("auth123"))
                .roles("AUTHORITY")
                .build();

        UserDetails fieldOfficer = User.builder()
                .username("field_officer")
                .password(encoder.encode("field123"))
                .roles("FIELD_OFFICER")
                .build();

        UserDetails viewer = User.builder()
                .username("viewer")
                .password(encoder.encode("viewer123"))
                .roles("VIEWER")
                .build();

        return new InMemoryUserDetailsManager(admin, authority, fieldOfficer, viewer);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                // Public read endpoints
                .requestMatchers("/api/v1/health", "/actuator/**", "/h2-console/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/zones/**", "/api/v1/forecast", "/api/v1/stats", "/api/v1/live/**", "/api/v1/ml/**", "/api/v1/auto-alerts/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/field-reports", "/api/v1/alerts", "/api/v1/audit-logs").permitAll()

                // Protected operational endpoints
                .requestMatchers(HttpMethod.POST, "/api/v1/alerts/dispatch").hasAnyRole("AUTHORITY", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/auto-alerts/toggle").hasAnyRole("AUTHORITY", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/field-reports").hasAnyRole("FIELD_OFFICER", "AUTHORITY", "ADMIN")
                .requestMatchers("/api/v1/incidents/*/verify").hasAnyRole("FIELD_OFFICER", "AUTHORITY", "ADMIN")

                // Administrative endpoints
                .requestMatchers("/api/v1/admin/**", "/api/v1/users/**").hasRole("ADMIN")

                // All other endpoints require authentication
                .anyRequest().authenticated()
            )
            .headers(headers -> headers.frameOptions(frame -> frame.disable()))
            .httpBasic(Customizer.withDefaults());

        return http.build();
    }
}
