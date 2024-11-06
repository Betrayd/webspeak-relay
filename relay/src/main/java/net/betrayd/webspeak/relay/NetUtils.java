package net.betrayd.webspeak.relay;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.AbstractMap.SimpleImmutableEntry;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Like most of the relay, a strait up copy from the webspeak server &#64;Igrium wrote cause I need to connect based on query parameters
 */
public class NetUtils {
    // https://stackoverflow.com/questions/13592236/parse-a-uri-string-into-name-value-collection
    public static Map<String, List<String>> splitQuery(String query) {
        return Arrays.stream(query.split("&"))
                .map(NetUtils::splitQueryParameter)
                .collect(Collectors.groupingBy(Map.Entry::getKey, LinkedHashMap::new,
                        Collectors.mapping(Map.Entry::getValue, Collectors.toList())));
    }

    /**
     * Split a set of query parameters, assuming that you will only have one instance of any given params.
     * @param query Query string.
     * @return Map of query parameters.
     */
    public static Map<String, String> splitQueryString(String query) {
        return Arrays.stream(query.split("&"))
                .map(NetUtils::splitQueryParameter)
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

    }

    public static Map.Entry<String, String> splitQueryParameter(String it) {
        final int idx = it.indexOf("=");
        final String key = idx > 0 ? it.substring(0, idx) : it;
        final String value = idx > 0 && it.length() > idx + 1 ? it.substring(idx + 1) : null;
        return new SimpleImmutableEntry<>(
                URLDecoder.decode(key, StandardCharsets.UTF_8),
                URLDecoder.decode(value, StandardCharsets.UTF_8));
    }
}
