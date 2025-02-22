/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

'use strict';

const Animated = require('Animated');
const Easing = require('Easing');
const NativeMethodsMixin = require('NativeMethodsMixin');
const Platform = require('Platform');
const React = require('React');
const PropTypes = require('prop-types');
const Touchable = require('Touchable');
const TouchableWithoutFeedback = require('TouchableWithoutFeedback');

const createReactClass = require('create-react-class');
const ensurePositiveDelayProps = require('ensurePositiveDelayProps');
const flattenStyle = require('flattenStyle');

import type {Props as TouchableWithoutFeedbackProps} from 'TouchableWithoutFeedback';
import type {ViewStyleProp} from 'StyleSheet';
import type {TVParallaxPropertiesType} from 'TVViewPropTypes';
import type {PressEvent} from 'CoreEventTypes';

const PRESS_RETENTION_OFFSET = {top: 20, left: 20, right: 20, bottom: 30};

const handledNativeKeyboardEvents = [
  {code: 'Space'},
  {code: 'Enter'},
  {code: 'GamepadA'},
];

type TVProps = $ReadOnly<{|
  hasTVPreferredFocus?: ?boolean,
  tvParallaxProperties?: ?TVParallaxPropertiesType,
|}>;

type Props = $ReadOnly<{|
  ...TouchableWithoutFeedbackProps,
  ...TVProps,
  activeOpacity?: ?number,
  style?: ?ViewStyleProp,
|}>;

/**
 * A wrapper for making views respond properly to touches.
 * On press down, the opacity of the wrapped view is decreased, dimming it.
 *
 * Opacity is controlled by wrapping the children in an Animated.View, which is
 * added to the view hiearchy.  Be aware that this can affect layout.
 *
 * Example:
 *
 * ```
 * renderButton: function() {
 *   return (
 *     <TouchableOpacity onPress={this._onPressButton}>
 *       <Image
 *         style={styles.button}
 *         source={require('./myButton.png')}
 *       />
 *     </TouchableOpacity>
 *   );
 * },
 * ```
 * ### Example
 *
 * ```ReactNativeWebPlayer
 * import React, { Component } from 'react'
 * import {
 *   AppRegistry,
 *   StyleSheet,
 *   TouchableOpacity,
 *   Text,
 *   View,
 * } from 'react-native'
 *
 * class App extends Component {
 *   constructor(props) {
 *     super(props)
 *     this.state = { count: 0 }
 *   }
 *
 *   onPress = () => {
 *     this.setState({
 *       count: this.state.count+1
 *     })
 *   }
 *
 *  render() {
 *    return (
 *      <View style={styles.container}>
 *        <TouchableOpacity
 *          style={styles.button}
 *          onPress={this.onPress}
 *        >
 *          <Text> Touch Here </Text>
 *        </TouchableOpacity>
 *        <View style={[styles.countContainer]}>
 *          <Text style={[styles.countText]}>
 *             { this.state.count !== 0 ? this.state.count: null}
 *           </Text>
 *         </View>
 *       </View>
 *     )
 *   }
 * }
 *
 * const styles = StyleSheet.create({
 *   container: {
 *     flex: 1,
 *     justifyContent: 'center',
 *     paddingHorizontal: 10
 *   },
 *   button: {
 *     alignItems: 'center',
 *     backgroundColor: '#DDDDDD',
 *     padding: 10
 *   },
 *   countContainer: {
 *     alignItems: 'center',
 *     padding: 10
 *   },
 *   countText: {
 *     color: '#FF00FF'
 *   }
 * })
 *
 * AppRegistry.registerComponent('App', () => App)
 * ```
 *
 */
const TouchableOpacity = ((createReactClass({
  displayName: 'TouchableOpacity',
  mixins: [Touchable.Mixin.withoutDefaultFocusAndBlur, NativeMethodsMixin],

  propTypes: {
    /* $FlowFixMe(>=0.89.0 site=react_native_fb) This comment suppresses an
     * error found when Flow v0.89 was deployed. To see the error, delete this
     * comment and run Flow. */
    ...TouchableWithoutFeedback.propTypes,
    /**
     * Determines what the opacity of the wrapped view should be when touch is
     * active. Defaults to 0.2.
     */
    activeOpacity: PropTypes.number,
    /**
     * TV preferred focus (see documentation for the View component).
     */
    hasTVPreferredFocus: PropTypes.bool,
    /**
     * Apple TV parallax effects
     */
    tvParallaxProperties: PropTypes.object,
  },

  getDefaultProps: function() {
    return {
      activeOpacity: 0.2,
    };
  },

  getInitialState: function() {
    return {
      /* $FlowFixMe(>=0.89.0 site=react_native_fb) This comment suppresses an
       * error found when Flow v0.89 was deployed. To see the error, delete
       * this comment and run Flow. */
      ...this.touchableGetInitialState(),
      /* $FlowFixMe(>=0.89.0 site=react_native_fb) This comment suppresses an
       * error found when Flow v0.89 was deployed. To see the error, delete
       * this comment and run Flow. */
      anim: new Animated.Value(this._getChildStyleOpacityWithDefault()),
    };
  },

  componentDidMount: function() {
    ensurePositiveDelayProps(this.props);
  },

  UNSAFE_componentWillReceiveProps: function(nextProps) {
    ensurePositiveDelayProps(nextProps);
  },

  componentDidUpdate: function(prevProps, prevState) {
    if (this.props.disabled !== prevProps.disabled) {
      this._opacityInactive(250);
    }
  },

  /**
   * Animate the touchable to a new opacity.
   */
  setOpacityTo: function(value: number, duration: number) {
    Animated.timing(this.state.anim, {
      toValue: value,
      duration: duration,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  },

  /**
   * `Touchable.Mixin` self callbacks. The mixin will invoke these if they are
   * defined on your component.
   */
  touchableHandleActivePressIn: function(e: PressEvent) {
    if (e.dispatchConfig.registrationName === 'onResponderGrant') {
      this._opacityActive(0);
    } else {
      this._opacityActive(150);
    }
    this.props.onPressIn && this.props.onPressIn(e);
  },

  touchableHandleActivePressOut: function(e: PressEvent) {
    this._opacityInactive(250);
    this.props.onPressOut && this.props.onPressOut(e);
  },

  touchableHandleFocus: function(e: Event) {
    if (Platform.isTV) {
      this._opacityActive(150);
    }
    this.props.onFocus && this.props.onFocus(e);
  },

  touchableHandleBlur: function(e: Event) {
    if (Platform.isTV) {
      this._opacityInactive(250);
    }
    this.props.onBlur && this.props.onBlur(e);
  },

  touchableHandlePress: function(e: PressEvent) {
    this.props.onPress && this.props.onPress(e);
  },

  touchableHandleLongPress: function(e: PressEvent) {
    this.props.onLongPress && this.props.onLongPress(e);
  },

  touchableGetPressRectOffset: function() {
    return this.props.pressRetentionOffset || PRESS_RETENTION_OFFSET;
  },

  touchableGetHitSlop: function() {
    return this.props.hitSlop;
  },

  touchableGetHighlightDelayMS: function() {
    return this.props.delayPressIn || 0;
  },

  touchableGetLongPressDelayMS: function() {
    return this.props.delayLongPress === 0
      ? 0
      : this.props.delayLongPress || 500;
  },

  touchableGetPressOutDelayMS: function() {
    return this.props.delayPressOut;
  },

  _opacityActive: function(duration: number) {
    this.setOpacityTo(this.props.activeOpacity, duration);
  },

  _opacityInactive: function(duration: number) {
    /* $FlowFixMe(>=0.89.0 site=react_native_fb) This comment suppresses an
     * error found when Flow v0.89 was deployed. To see the error, delete this
     * comment and run Flow. */
    this.setOpacityTo(this._getChildStyleOpacityWithDefault(), duration);
  },

  _getChildStyleOpacityWithDefault: function() {
    const childStyle = flattenStyle(this.props.style) || {};
    return childStyle.opacity == null ? 1 : childStyle.opacity;
  },

  _onKeyUp: function(ev) {
    if (
      (ev.nativeEvent.code === 'Space' ||
        ev.nativeEvent.code === 'Enter' ||
        ev.nativeEvent.code === 'GamepadA') &&
      !this.props.disabled
    ) {
      this.touchableHandlePress();
    }
  },

  _onKeyDown: function(ev) {
    if (
      (ev.nativeEvent.code === 'Space' ||
        ev.nativeEvent.code === 'Enter' ||
        ev.nativeEvent.code === 'GamepadA') &&
      !this.props.disabled
    ) {
      this.touchableHandleActivePressIn();
    }
  },

  render: function() {
    return (
      <Animated.View
        onKeyUp={this._onKeyUp}
        onKeyDown={this._onKeyDown}
        accessible={this.props.accessible !== false}
        accessibilityLabel={this.props.accessibilityLabel}
        accessibilityHint={this.props.accessibilityHint} // TODO(OSS Candidate ISS#2710739)
        accessibilityRole={this.props.accessibilityRole}
        accessibilityStates={this.props.accessibilityStates}
        onAccessibilityTap={this.props.onAccessibilityTap} // TODO(OSS Candidate ISS#2710739)
        acceptsKeyboardFocus={
          (this.props.acceptsKeyboardFocus === undefined ||
            this.props.acceptsKeyboardFocus) &&
          !this.props.disabled
        } // TODO(macOS ISS#2323203)
        enableFocusRing={
          (this.props.enableFocusRing === undefined ||
            this.props.enableFocusRing) &&
          !this.props.disabled
        } // TODO(macOS ISS#2323203)
        tabIndex={this.props.tabIndex} // TODO(win ISS#2323203)
        style={[this.props.style, {opacity: this.state.anim}]}
        nativeID={this.props.nativeID}
        testID={this.props.testID}
        onLayout={this.props.onLayout}
        isTVSelectable={true}
        hasTVPreferredFocus={this.props.hasTVPreferredFocus}
        tvParallaxProperties={this.props.tvParallaxProperties}
        hitSlop={this.props.hitSlop}
        /* $FlowFixMe(>=0.89.0 site=react_native_fb) This comment suppresses an
         * error found when Flow v0.89 was deployed. To see the error, delete
         * this comment and run Flow. */
        onStartShouldSetResponder={this.touchableHandleStartShouldSetResponder}
        onResponderTerminationRequest={
          /* $FlowFixMe(>=0.89.0 site=react_native_fb) This comment suppresses
           * an error found when Flow v0.89 was deployed. To see the error,
           * delete this comment and run Flow. */
          this.touchableHandleResponderTerminationRequest
        }
        /* $FlowFixMe(>=0.89.0 site=react_native_fb) This comment suppresses an
         * error found when Flow v0.89 was deployed. To see the error, delete
         * this comment and run Flow. */
        onResponderGrant={this.touchableHandleResponderGrant}
        /* $FlowFixMe(>=0.89.0 site=react_native_fb) This comment suppresses an
         * error found when Flow v0.89 was deployed. To see the error, delete
         * this comment and run Flow. */
        onResponderMove={this.touchableHandleResponderMove}
        /* $FlowFixMe(>=0.89.0 site=react_native_fb) This comment suppresses an
         * error found when Flow v0.89 was deployed. To see the error, delete
         * this comment and run Flow. */
        onResponderRelease={this.touchableHandleResponderRelease}
        /* $FlowFixMe(>=0.89.0 site=react_native_fb) This comment suppresses an
         * error found when Flow v0.89 was deployed. To see the error, delete
         * this comment and run Flow. */
        onResponderTerminate={this.touchableHandleResponderTerminate}
        tooltip={this.props.tooltip} // TODO(macOS/win ISS#2323203)
        clickable={
          this.props.clickable !== false && this.props.onPress !== undefined
        } // TODO(android ISS)
        onClick={this.touchableHandlePress} // TODO(android ISS)
        onMouseEnter={this.props.onMouseEnter} // [TODO(macOS ISS#2323203)
        onMouseLeave={this.props.onMouseLeave}
        keyDownEvents={handledNativeKeyboardEvents}
        keyUpEvents={handledNativeKeyboardEvents}
        onDragEnter={this.props.onDragEnter}
        onDragLeave={this.props.onDragLeave}
        onDrop={this.props.onDrop}
        draggedTypes={this.props.draggedTypes}>
        {this.props.children}
        {Touchable.renderDebugView({
          color: 'cyan',
          hitSlop: this.props.hitSlop,
        })}
      </Animated.View>
    );
  },
}): any): React.ComponentType<Props>);

module.exports = TouchableOpacity;
