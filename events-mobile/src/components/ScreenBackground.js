import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export default function ScreenBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.baseWash} />
      <View style={styles.mist} />
      <View style={[styles.blob, styles.blobSky]} />
      <View style={[styles.blob, styles.blobSkySoft]} />
      <View style={[styles.blob, styles.blobGold]} />
      <View style={[styles.blob, styles.blobTeal]} />
      <View style={[styles.blob, styles.blobTealSoft]} />
    </View>
  );
}

const styles = StyleSheet.create({
  baseWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.shell,
  },
  mist: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobSky: {
    width: 280,
    height: 280,
    left: -90,
    top: -50,
    backgroundColor: 'rgba(14, 165, 233, 0.22)',
  },
  blobSkySoft: {
    width: 180,
    height: 180,
    left: 90,
    top: 70,
    backgroundColor: 'rgba(125, 211, 252, 0.15)',
  },
  blobGold: {
    width: 220,
    height: 220,
    right: -60,
    top: -10,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
  },
  blobTeal: {
    width: 260,
    height: 260,
    right: -50,
    bottom: 40,
    backgroundColor: 'rgba(20, 184, 166, 0.16)',
  },
  blobTealSoft: {
    width: 170,
    height: 170,
    left: -30,
    bottom: 120,
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
  },
});