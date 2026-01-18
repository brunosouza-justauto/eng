import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, Globe } from 'lucide-react-native';
import { useLocale } from '../contexts/LocaleContext';
import { useTheme } from '../contexts/ThemeContext';
import { HapticPressable } from './HapticPressable';

interface LanguageSelectorProps {
  showHeader?: boolean;
}

export function LanguageSelector({ showHeader = true }: LanguageSelectorProps) {
  const { locale, setLocale, supportedLocales } = useLocale();
  const { isDark } = useTheme();

  return (
    <View style={styles.container}>
      {showHeader && (
        <Text
          style={[
            styles.header,
            { color: isDark ? '#9CA3AF' : '#6B7280' },
          ]}
        >
          Language
        </Text>
      )}
      <View style={styles.optionsContainer}>
        {supportedLocales.map((lang) => (
          <HapticPressable
            key={lang.code}
            onPress={() => setLocale(lang.code)}
            style={[
              styles.option,
              {
                backgroundColor:
                  locale === lang.code
                    ? isDark
                      ? '#374151'
                      : '#EEF2FF'
                    : 'transparent',
                borderColor: isDark ? '#374151' : '#E5E7EB',
              },
            ]}
          >
            <Globe
              size={20}
              color={locale === lang.code ? '#6366F1' : isDark ? '#9CA3AF' : '#6B7280'}
            />
            <View style={styles.labelContainer}>
              <Text
                style={[
                  styles.label,
                  {
                    color: locale === lang.code
                      ? '#6366F1'
                      : isDark
                        ? '#F9FAFB'
                        : '#111827',
                  },
                ]}
              >
                {lang.nativeLabel}
              </Text>
              {lang.nativeLabel !== lang.label && (
                <Text
                  style={[
                    styles.sublabel,
                    { color: isDark ? '#9CA3AF' : '#6B7280' },
                  ]}
                >
                  {lang.label}
                </Text>
              )}
            </View>
            {locale === lang.code && (
              <Check size={20} color="#6366F1" />
            )}
          </HapticPressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  optionsContainer: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  sublabel: {
    fontSize: 13,
    marginTop: 2,
  },
});

export default LanguageSelector;
