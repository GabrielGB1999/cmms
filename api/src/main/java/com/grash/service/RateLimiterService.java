package com.grash.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.annotation.PostConstruct;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class RateLimiterService {

    // Expiring and capped, so a flood of made-up emails can't grow memory forever
    private Cache<String, Bucket> loginAttemptCache;

    @Getter
    @Value("${security.rate-limit.brute-force.enabled:true}")
    private boolean bruteForceEnabled;

    @Value("${security.rate-limit.brute-force.login.max-attempts:5}")
    private int loginMaxAttempts;

    @Value("${security.rate-limit.brute-force.login.period-minutes:15}")
    private int loginPeriodMinutes;

    @Value("${security.rate-limit.brute-force.login.long-term-max-attempts:20}")
    private int loginLongTermMaxAttempts;

    @Value("${security.rate-limit.brute-force.login.long-term-period-hours:24}")
    private int loginLongTermPeriodHours;

    /**
     * Consume one attempt for the given login identifier (email).
     * Returns true if the attempt is allowed, false once the limit is reached.
     */
    public boolean tryConsumeLoginAttempt(String key) {
        return loginAttemptCache.get(key, this::newLoginAttemptBucket).tryConsume(1);
    }

    /**
     * Reset the failed-login attempts counter for a given identifier after a successful login.
     */
    public void resetLoginAttempts(String key) {
        Bucket bucket = loginAttemptCache.getIfPresent(key);
        if (bucket != null) {
            bucket.reset();
        }
    }

    @PostConstruct
    void init() {
        loginAttemptCache = Caffeine.newBuilder()
                .expireAfterAccess(Duration.ofHours(loginLongTermPeriodHours))
                .maximumSize(100_000)
                .build();
    }

    private Bucket newLoginAttemptBucket(String key) {
        // Short-term limit, e.g. 5 attempts per 15 minutes per identifier
        Bandwidth shortTerm = Bandwidth.classic(
                loginMaxAttempts,
                Refill.greedy(loginMaxAttempts, Duration.ofMinutes(loginPeriodMinutes))
        );

        // Long-term limit, e.g. 20 attempts per 24 hours per identifier
        Bandwidth longTerm = Bandwidth.classic(
                loginLongTermMaxAttempts,
                Refill.greedy(loginLongTermMaxAttempts, Duration.ofHours(loginLongTermPeriodHours))
        );

        return Bucket.builder()
                .addLimit(shortTerm)
                .addLimit(longTerm)
                .build();
    }
}
