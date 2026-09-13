import React, { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { PrimaryButton } from './PrimaryButton';

const REASONS = [
  'Pinyin looks wrong',
  'Definition looks wrong',
  'Example sentence looks wrong',
  'Offensive or inappropriate',
  'Other',
];

interface ReportIssueModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export function ReportIssueModal({ visible, onClose, onSubmit }: ReportIssueModalProps) {
  const { palette } = useTheme();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [note, setNote] = useState('');

  function reset() {
    setSelectedReason(null);
    setNote('');
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: palette.surfaceElevated }]}>
          <Text style={[typography.sectionTitle, { color: palette.textPrimary }]}>Report an issue</Text>
          <Text style={[typography.body, styles.subtitle, { color: palette.textSecondary }]}>
            What's wrong with this phrase?
          </Text>

          <View style={styles.reasons}>
            {REASONS.map(reason => {
              const selected = reason === selectedReason;
              return (
                <Pressable
                  key={reason}
                  onPress={() => setSelectedReason(reason)}
                  style={[
                    styles.reasonChip,
                    {
                      backgroundColor: selected ? palette.accentSoft : palette.surface,
                      borderColor: selected ? palette.accent : palette.border,
                    },
                  ]}
                >
                  <Text style={{ color: selected ? palette.accent : palette.textPrimary }}>{reason}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            style={[styles.input, { color: palette.textPrimary, borderColor: palette.border }]}
            placeholder="Add a note (optional)"
            placeholderTextColor={palette.textTertiary}
            value={note}
            onChangeText={setNote}
            multiline
          />

          <PrimaryButton
            label="Submit report"
            disabled={!selectedReason}
            onPress={() => {
              if (!selectedReason) return;
              const reason = note.trim() ? `${selectedReason}: ${note.trim()}` : selectedReason;
              onSubmit(reason);
              reset();
            }}
          />
          <PrimaryButton
            label="Cancel"
            variant="ghost"
            onPress={() => {
              reset();
              onClose();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 14,
  },
  subtitle: {
    marginBottom: 4,
  },
  reasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderRadius: 14,
    padding: 14,
    minHeight: 70,
    textAlignVertical: 'top',
  },
});
