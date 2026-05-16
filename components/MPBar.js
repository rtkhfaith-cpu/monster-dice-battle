import React from 'react';
import HPBar from './HPBar';

/** MP meter — hue tuned cooler than HP. */
export default function MPBar(props) {
  return <HPBar {...props} fillColor="#6366f1" label={props.label ?? 'MP'} />;
}
