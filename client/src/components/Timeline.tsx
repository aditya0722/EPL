import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Brand, Spacing } from '../constants/theme';
import { Check, AlertTriangle, HelpCircle } from 'lucide-react-native';

interface TimelineStep {
  title: string;
  description: string;
  isActive: boolean;
  isCompleted: boolean;
  isError?: boolean;
  timestamp?: string;
}

interface TimelineProps {
  status: string;
  remarks?: string | null;
  updatedAt?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ status, remarks, updatedAt }) => {
  const theme = Colors.light;

  // Format date helper
  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSteps = (): TimelineStep[] => {
    const isSubmitted = true;
    const isReview = ['under_review', 'approved', 'disbursed', 'closed', 'rejected', 'defaulted'].includes(status);
    const isApproved = ['approved', 'disbursed', 'closed'].includes(status);
    const isRejected = status === 'rejected';
    const isDisbursed = ['disbursed', 'closed'].includes(status);
    const isClosed = status === 'closed';

    const timeStr = formatDate(updatedAt);

    return [
      {
        title: 'Application Submitted',
        description: 'Your loan application request has been received.',
        isActive: true,
        isCompleted: isReview,
        timestamp: isReview ? '' : timeStr,
      },
      {
        title: 'Under Manual Review',
        description: 'Admin is reviewing details. Expect a call shortly.',
        isActive: isReview,
        isCompleted: isApproved || isRejected,
        timestamp: status === 'under_review' ? timeStr : '',
      },
      {
        title: isRejected ? 'Application Rejected' : 'Application Approved',
        description: isRejected
          ? `Rejected by admin. Remarks: ${remarks || 'None'}`
          : isApproved
          ? `Approved. Remarks: ${remarks || 'Approved by admin'}`
          : 'Decision pending from the provider.',
        isActive: isApproved || isRejected,
        isCompleted: isDisbursed,
        isError: isRejected,
        timestamp: isApproved || isRejected ? timeStr : '',
      },
      {
        title: 'Payment Sent (Disbursed)',
        description: isDisbursed
          ? 'Approved loan funds have been manually transferred.'
          : 'Pending approval and manual transfer.',
        isActive: isDisbursed,
        isCompleted: isClosed,
        timestamp: status === 'disbursed' ? timeStr : '',
      },
      {
        title: 'Loan Closed',
        description: isClosed
          ? 'Outstanding balance fully repaid. Thank you!'
          : 'Awaiting completion of all repayments.',
        isActive: isClosed,
        isCompleted: isClosed,
        timestamp: status === 'closed' ? timeStr : '',
      },
    ];
  };

  const steps = getSteps();

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        
        // Icon picker
        const renderIcon = () => {
          if (step.isError) {
            return <AlertTriangle size={14} color="#FFFFFF" />;
          }
          if (step.isCompleted) {
            return <Check size={14} color="#FFFFFF" />;
          }
          if (step.isActive) {
            return <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />;
          }
          return null;
        };

        const getIconBg = () => {
          if (step.isError) return theme.error;
          if (step.isCompleted) return theme.success;
          if (step.isActive) return theme.primary + '22';
          return '#E5E7EB';
        };

        return (
          <View key={index} style={styles.stepContainer}>
            {/* Left side timeline graphic */}
            <View style={styles.leftColumn}>
              <View
                style={[
                  styles.iconOuter,
                  {
                    backgroundColor: getIconBg(),
                    borderColor: step.isActive ? theme.primary : 'transparent',
                    borderWidth: step.isActive ? 2 : 0,
                  },
                ]}
              >
                {renderIcon()}
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.connectorLine,
                    {
                      backgroundColor: step.isCompleted ? theme.success : '#E5E7EB',
                    },
                  ]}
                />
              )}
            </View>

            {/* Right side content */}
            <View style={styles.rightColumn}>
              <View style={styles.headerRow}>
                <Text
                  style={[
                    styles.stepTitle,
                    {
                      color: step.isError
                        ? theme.error
                        : step.isActive
                        ? theme.text
                        : theme.textSecondary,
                      fontWeight: step.isActive ? '700' : '600',
                    },
                  ]}
                >
                  {step.title}
                </Text>
                {step.timestamp ? (
                  <Text style={styles.timestamp}>{step.timestamp}</Text>
                ) : null}
              </View>
              <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
                {step.description}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingLeft: Spacing.one,
    marginVertical: Spacing.two,
  },
  stepContainer: {
    flexDirection: 'row',
    minHeight: 80,
  },
  leftColumn: {
    alignItems: 'center',
    marginRight: Spacing.three,
  },
  iconOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connectorLine: {
    width: 2.5,
    flex: 1,
    marginVertical: 4,
    zIndex: 1,
  },
  rightColumn: {
    flex: 1,
    paddingTop: 2,
    paddingBottom: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 15,
  },
  stepDesc: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  timestamp: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});
