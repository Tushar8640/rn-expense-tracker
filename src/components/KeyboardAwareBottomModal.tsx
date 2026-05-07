import React, { ReactNode, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardEvent,
  Modal,
  ModalProps,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";

interface KeyboardAwareBottomModalProps {
  visible: boolean;
  children: ReactNode;
  onClose: () => void;
  animationType?: ModalProps["animationType"];
  overlayStyle?: StyleProp<ViewStyle>;
  sheetStyle?: StyleProp<ViewStyle>;
}

export default function KeyboardAwareBottomModal({
  visible,
  children,
  onClose,
  animationType = "slide",
  overlayStyle,
  sheetStyle,
}: KeyboardAwareBottomModalProps) {
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateTo = (toValue: number, event?: KeyboardEvent) => {
      Animated.timing(keyboardOffset, {
        toValue,
        duration: event?.duration ?? 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    };

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      animateTo(event.endCoordinates.height, event);
    });
    const hideSub = Keyboard.addListener(hideEvent, (event) => {
      animateTo(0, event);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardOffset]);

  return (
    <Modal visible={visible} transparent animationType={animationType} statusBarTranslucent>
      <Pressable style={[s.overlay, overlayStyle]} onPress={onClose}>
        <Animated.View style={{ paddingBottom: keyboardOffset }}>
          <Pressable style={sheetStyle} onPress={() => {}}>
            {children}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
});
