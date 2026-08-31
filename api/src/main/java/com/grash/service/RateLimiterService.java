package com.grash.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
public class RateLimiterService {

    private final ConcurrentMap<String, Bucket> cache = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Bucket> loginAttemptCache = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Bucket> resetPasswordAttemptCache = new ConcurrentHashMap<>();

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

    @Value("${security.rate-limit.brute-force.reset-password.max-attempts:3}")
    private int resetPasswordMaxAttempts;

    @Value("${security.rate-limit.brute-force.reset-password.period-minutes:10}")
    private int resetPasswordPeriodMinutes;

    @Value("${security.rate-limit.brute-force.reset-password.long-term-max-attempts:10}")
    private int resetPasswordLongTermMaxAttempts;

    @Value("${security.rate-limit.brute-force.reset-password.long-term-period-hours:24}")
    private int resetPasswordLongTermPeriodHours;

    public Bucket resolveBucket(String key) {
        return cache.computeIfAbsent(key, this::newBucket);
    }

    private Bucket newBucket(String key) {
        // 1 request per minute
        Bandwidth onePerMinute = Bandwidth.classic(1, Refill.greedy(1, Duration.ofMinutes(1)));

        // 2 requests per 5 hours
        Bandwidth twoPer5Hours = Bandwidth.classic(2, Refill.greedy(2, Duration.ofHours(5)));

        return Bucket.builder()
                .addLimit(onePerMinute)
                .addLimit(twoPer5Hours)
                .build();
    }

    /**
     * Consume one attempt for the given login identifier (email).
     * Returns true if the attempt is allowed, false once the limit is reached.
     */
    public boolean tryConsumeLoginAttempt(String key) {
        return loginAttemptCache.computeIfAbsent(key, this::newLoginAttemptBucket).tryConsume(1);
    }

    /**
     * Reset the failed-login attempts counter for a given identifier after a successful login.
     */
    public void resetLoginAttempts(String key) {
        Bucket bucket = loginAttemptCache.get(key);
        if (bucket != null) {
            bucket.reset();
        }
    }

    /**
     * Consume one password reset request for the given email.
     */
    public boolean tryConsumeResetPasswordAttempt(String key) {
        return resetPasswordAttemptCache.computeIfAbsent(key, this::newResetPasswordAttemptBucket).tryConsume(1);
    }

    /**
     * Reset the password reset attempts counter for a given email.
     */
    public void resetResetPasswordAttempts(String key) {
        Bucket bucket = resetPasswordAttemptCache.get(key);
        if (bucket != null) {
            bucket.reset();
        }
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

    private Bucket newResetPasswordAttemptBucket(String key) {
        // Short-term limit, e.g. 3 requests per 10 minutes per email
        Bandwidth shortTerm = Bandwidth.classic(
                resetPasswordMaxAttempts,
                Refill.greedy(resetPasswordMaxAttempts, Duration.ofMinutes(resetPasswordPeriodMinutes))
        );

        // Long-term limit, e.g. 10 requests per 24 hours per email
        Bandwidth longTerm = Bandwidth.classic(
                resetPasswordLongTermMaxAttempts,
                Refill.greedy(resetPasswordLongTermMaxAttempts, Duration.ofHours(resetPasswordLongTermPeriodHours))
        );

        return Bucket.builder()
                .addLimit(shortTerm)
                .addLimit(longTerm)
                .build();
    }
}
