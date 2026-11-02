package com.grash.configuration;

import com.grash.repository.UserRepository;
import com.grash.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Map;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private static final String USER_ID = "userId";

    @Value("${frontend.url}")
    private String frontendUrl;

    // Lazy: the messaging beans are built before the services that use them
    @Autowired
    @Lazy
    private JwtTokenProvider jwtTokenProvider;
    @Autowired
    @Lazy
    private UserRepository userRepository;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/notifications");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOrigins(frontendUrl)
                .withSockJS();
    }

    // CONNECT must carry a valid token, a client may only subscribe to its own user's notifications,
    // and clients never SEND (no @MessageMapping handlers exist).
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null || accessor.getCommand() == null) return message;
                Map<String, Object> session = accessor.getSessionAttributes();
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String token = accessor.getFirstNativeHeader("token");
                    Long userId = null;
                    try {
                        if (token != null && jwtTokenProvider.validateToken(token)) {
                            userId = userRepository.findByEmailIgnoreCase(jwtTokenProvider.getUsername(token))
                                    .map(user -> user.getId()).orElse(null);
                        }
                    } catch (RuntimeException ignored) {
                        // invalid or expired token: refused below
                    }
                    if (userId == null || session == null) throw new MessagingException("Unauthorized");
                    session.put(USER_ID, userId);
                } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                    Object userId = session == null ? null : session.get(USER_ID);
                    if (userId == null || !("/notifications/" + userId).equals(accessor.getDestination()))
                        throw new MessagingException("Forbidden");
                } else if (StompCommand.SEND.equals(accessor.getCommand())) {
                    // only the server publishes notifications; clients must not inject them
                    throw new MessagingException("Forbidden");
                }
                return message;
            }
        });
    }
}
