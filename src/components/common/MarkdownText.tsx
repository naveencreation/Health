import React from 'react';
import { View, Text, StyleSheet, Platform, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Fonts } from '@/theme/typography';

interface MarkdownTextProps {
  content: string;
  isUser?: boolean;
  baseStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

// Regex to capture markdown tokens within a line:
// - ***bold italic***
// - **bold** or __bold__
// - *italic* or _italic_
// - `inline code`
// - ~~strikethrough~~
const INLINE_REGEX =
  /(\*\*\*[^*]+?\*\*\*|___[^_]+?___|\*\*[^*]+?\*\*|__[^_]+?__|\*[^*]+?\*|_[^_]+?_|`[^`]+?`|~~[^~]+?~~)/g;

export const MarkdownText: React.FC<MarkdownTextProps> = ({
  content,
  isUser = false,
  baseStyle,
  containerStyle,
}) => {
  if (!content) return null;

  // Handle live streaming: if trailing odd '**' exists, auto-close so bold styles immediately
  let processed = content;
  const doubleAsteriskCount = (processed.match(/\*\*/g) || []).length;
  if (doubleAsteriskCount % 2 === 1) {
    processed += '**';
  }

  const lines = processed.split('\n');

  // Render inline formatting within a text snippet
  const renderInlineTokens = (textSegment: string, lineKey: string | number) => {
    const tokens = textSegment.split(INLINE_REGEX);

    return tokens.map((token, idx) => {
      const key = `${lineKey}_token_${idx}`;

      if (!token) return null;

      // Bold + Italic: ***text*** or ___text___
      if (
        (token.startsWith('***') && token.endsWith('***') && token.length >= 6) ||
        (token.startsWith('___') && token.endsWith('___') && token.length >= 6)
      ) {
        return (
          <Text
            key={key}
            style={[
              styles.boldText,
              styles.italicText,
              isUser ? styles.boldUser : styles.boldRia,
            ]}
          >
            {token.slice(3, -3)}
          </Text>
        );
      }

      // Bold: **text** or __text__
      if (
        (token.startsWith('**') && token.endsWith('**') && token.length >= 4) ||
        (token.startsWith('__') && token.endsWith('__') && token.length >= 4)
      ) {
        return (
          <Text
            key={key}
            style={[styles.boldText, isUser ? styles.boldUser : styles.boldRia]}
          >
            {token.slice(2, -2)}
          </Text>
        );
      }

      // Italic: *text* or _text_
      if (
        (token.startsWith('*') && token.endsWith('*') && token.length >= 2) ||
        (token.startsWith('_') && token.endsWith('_') && token.length >= 2)
      ) {
        return (
          <Text key={key} style={styles.italicText}>
            {token.slice(1, -1)}
          </Text>
        );
      }

      // Inline Code: `text`
      if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
        return (
          <Text
            key={key}
            style={[styles.codeText, isUser ? styles.codeUser : styles.codeRia]}
          >
            {token.slice(1, -1)}
          </Text>
        );
      }

      // Strikethrough: ~~text~~
      if (token.startsWith('~~') && token.endsWith('~~') && token.length >= 4) {
        return (
          <Text key={key} style={styles.strikethroughText}>
            {token.slice(2, -2)}
          </Text>
        );
      }

      // Plain Text
      return <Text key={key}>{token}</Text>;
    });
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // 1. Empty line -> Paragraph separator spacer
        if (!trimmed) {
          return <View key={`spacer_${lineIdx}`} style={styles.paragraphSpacer} />;
        }

        // 2. Headings: ###, ##, #
        if (trimmed.startsWith('### ')) {
          return (
            <Text
              key={`h3_${lineIdx}`}
              style={[
                styles.baseText,
                baseStyle,
                styles.heading3,
                isUser ? styles.headingUser : styles.headingRia,
              ]}
            >
              {renderInlineTokens(trimmed.slice(4), lineIdx)}
            </Text>
          );
        }

        if (trimmed.startsWith('## ')) {
          return (
            <Text
              key={`h2_${lineIdx}`}
              style={[
                styles.baseText,
                baseStyle,
                styles.heading2,
                isUser ? styles.headingUser : styles.headingRia,
              ]}
            >
              {renderInlineTokens(trimmed.slice(3), lineIdx)}
            </Text>
          );
        }

        if (trimmed.startsWith('# ')) {
          return (
            <Text
              key={`h1_${lineIdx}`}
              style={[
                styles.baseText,
                baseStyle,
                styles.heading1,
                isUser ? styles.headingUser : styles.headingRia,
              ]}
            >
              {renderInlineTokens(trimmed.slice(2), lineIdx)}
            </Text>
          );
        }

        // 3. Bullet Items: •, *, -
        const bulletMatch = trimmed.match(/^([•*-])\s+(.*)$/);
        if (bulletMatch) {
          const bulletContent = bulletMatch[2];
          return (
            <View key={`bullet_${lineIdx}`} style={styles.bulletRow}>
              <Text
                style={[
                  styles.bulletDot,
                  { color: isUser ? '#FFFFFF' : '#F47551' },
                ]}
              >
                •
              </Text>
              <Text style={[styles.baseText, baseStyle, styles.bulletContentText]}>
                {renderInlineTokens(bulletContent, lineIdx)}
              </Text>
            </View>
          );
        }

        // 4. Numbered List Items: 1. , 2. , etc.
        const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
        if (numberedMatch) {
          const numberPrefix = numberedMatch[1];
          const numberedContent = numberedMatch[2];
          return (
            <View key={`numbered_${lineIdx}`} style={styles.numberedRow}>
              <Text
                style={[
                  styles.numberPrefixText,
                  { color: isUser ? '#FFFFFF' : '#F47551' },
                ]}
              >
                {numberPrefix}.
              </Text>
              <Text style={[styles.baseText, baseStyle, styles.bulletContentText]}>
                {renderInlineTokens(numberedContent, lineIdx)}
              </Text>
            </View>
          );
        }

        // 5. Blockquote: > ...
        if (trimmed.startsWith('> ')) {
          return (
            <View
              key={`quote_${lineIdx}`}
              style={[
                styles.blockquoteRow,
                isUser ? styles.blockquoteUser : styles.blockquoteRia,
              ]}
            >
              <Text
                style={[
                  styles.baseText,
                  baseStyle,
                  styles.italicText,
                  isUser ? styles.quoteTextUser : styles.quoteTextRia,
                ]}
              >
                {renderInlineTokens(trimmed.slice(2), lineIdx)}
              </Text>
            </View>
          );
        }

        // 6. Normal Paragraph Line
        return (
          <Text
            key={`line_${lineIdx}`}
            style={[
              styles.baseText,
              baseStyle,
              lineIdx > 0 && lines[lineIdx - 1].trim() === ''
                ? styles.paragraphStart
                : null,
            ]}
          >
            {renderInlineTokens(line, lineIdx)}
          </Text>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  baseText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 13.5,
    lineHeight: 20.5,
    color: '#1E293B',
  },
  paragraphSpacer: {
    height: 8,
  },
  paragraphStart: {
    marginTop: 2,
  },
  boldText: {
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
  },
  boldRia: {
    color: '#0F172A',
  },
  boldUser: {
    color: '#FFFFFF',
  },
  italicText: {
    fontStyle: 'italic',
  },
  strikethroughText: {
    textDecorationLine: 'line-through',
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  codeRia: {
    backgroundColor: 'rgba(244, 117, 81, 0.1)',
    color: '#C2410C',
  },
  codeUser: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    color: '#FFFFFF',
  },
  heading1: {
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
    fontSize: 17,
    lineHeight: 23,
    marginTop: 8,
    marginBottom: 4,
  },
  heading2: {
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
    fontSize: 15.5,
    lineHeight: 21,
    marginTop: 6,
    marginBottom: 3,
  },
  heading3: {
    fontFamily: Fonts.poppins.semiBold,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 2,
  },
  headingRia: {
    color: '#0F172A',
  },
  headingUser: {
    color: '#FFFFFF',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
    paddingLeft: 2,
  },
  bulletDot: {
    fontSize: 14,
    lineHeight: 20,
    marginRight: 6,
    fontWeight: '700',
  },
  bulletContentText: {
    flex: 1,
    lineHeight: 20,
  },
  numberedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
    paddingLeft: 2,
  },
  numberPrefixText: {
    fontFamily: Fonts.poppins.bold,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 20,
    marginRight: 6,
    minWidth: 16,
  },
  blockquoteRow: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginVertical: 4,
  },
  blockquoteRia: {
    borderLeftColor: '#F47551',
    backgroundColor: 'rgba(244, 117, 81, 0.05)',
  },
  blockquoteUser: {
    borderLeftColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  quoteTextRia: {
    color: '#475569',
  },
  quoteTextUser: {
    color: '#FFFFFF',
  },
});
