import React, {
  JSX,
  useContext,
  useEffect,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import {DestinationType, MeetingState} from '@webex/component-adapter-interfaces';
import Badge from '../generic/Badge/Badge';
import Modal from '../generic/Modal/Modal';
import Title from '../generic/Title/Title';
import {PHONE_LARGE} from '../breakpoints';

import WebexInMeeting from '../WebexInMeeting/WebexInMeeting';
import WebexInterstitialMeeting from '../WebexInterstitialMeeting/WebexInterstitialMeeting';
import WebexMeetingControlBar from '../WebexMeetingControlBar/WebexMeetingControlBar';
import WebexMeetingGuestAuthentication from '../WebexMeetingGuestAuthentication/WebexMeetingGuestAuthentication';
import WebexMeetingHostAuthentication from '../WebexMeetingHostAuthentication/WebexMeetingHostAuthentication';
import WebexMemberRoster from '../WebexMemberRoster/WebexMemberRoster';
import WebexSettings from '../WebexSettings/WebexSettings';
import WebexWaitingForHost from '../WebexWaitingForHost/WebexWaitingForHost';
import webexComponentClasses from '../helpers';
import {useElementDimensions, useMeeting, useRef} from '../hooks';
import {AdapterContext, MeetingContext} from '../hooks/contexts';

/**
 * Webex Meeting component displays the default Webex meeting experience.
 *
 * @param {object} props  Data passed to the component
 * @param {string} [props.className]  Custom CSS class to apply
 * @param {Function} [props.controls]   Controls to display
 * @param {number} [props.controlsCollapseRangeStart=0]  Zero-based index of the first collapsible control (can be negative)
 * @param {number} [props.controlsCollapseRangeEnd=-1]  Zero-based index before the last collapsible control (can be negative)
 * @param {Function} [props.controlsTabIndexes]  TabIndex for each control
 * @param {string} props.layout  Layout to apply on remote video
 * @param {JSX.Element} [props.logo]  Logo
 * @param {string} [props.meetingID]  ID of the meeting
 * @param {string} [props.meetingPasswordOrPin] Password or pin to join the meeting
 * @param {string} [props.participantName] Name of the participant joining the meeting
 * @param {object} [props.style]  Custom style to apply
 * @returns {object} JSX of the component
 */
export default function WebexMeeting({
  className,
  controls,
  controlsCollapseRangeStart,
  controlsCollapseRangeEnd,
  controlsTabIndexes,
  layout,
  logo,
  meetingID,
  meetingPasswordOrPin,
  participantName,
  style,
}) {
  const {
    ID,
    localAudio,
    localVideo,
    state,
    showRoster,
    settings,
    passwordRequired,
  } = useMeeting(meetingID);

  const {JOINED, NOT_JOINED, LEFT} = MeetingState;
  const adapter = useContext(AdapterContext);
  const mediaRef = useRef();
  const {width} = useElementDimensions(mediaRef);
  const [cssClasses, sc] = webexComponentClasses('meeting', className, {'roster-only': showRoster && width <= PHONE_LARGE});
  const [showToast, setShowToast] = useState(false);
  const toastTimeoutRef = useRef();
  const [authModal, setAuthModal] = useState('guest');
  const {setParticipantName, setMeetingPinPasswd} = useContext(MeetingContext);

  if (meetingPasswordOrPin) {
    setMeetingPinPasswd(meetingPasswordOrPin);
  }

  if (participantName) {
    setParticipantName(participantName);
  }

  useEffect(() => {
    if (state && state !== LEFT) {
      setShowToast(true);
      toastTimeoutRef.current = setTimeout(() => {
        setShowToast(false);
      }, 3000);
    }

    return () => clearTimeout(toastTimeoutRef.current);
  }, [localAudio.stream, localVideo.stream, state, LEFT]);

  const toastText = `${localAudio.stream ? 'Unmuted' : 'Muted'}, ${localVideo.stream ? 'Camera on' : 'Camera off'}`;
  let meetingDisplay;

  // A meeting with a falsy state means that the meeting has not been created
  if (!state) {
    meetingDisplay = <div className={sc('loading-logo')} />;
  } else if (state === LEFT) {
    meetingDisplay = <Title type="subsection" className={sc('centered')}>You&apos;ve successfully left the meeting</Title>;
  } else {
    let InnerMeeting;

    if (state === JOINED) {
      InnerMeeting = WebexInMeeting;
    } else if (state === NOT_JOINED) {
      InnerMeeting = WebexInterstitialMeeting;
    } else {
      InnerMeeting = WebexWaitingForHost;
    }

    meetingDisplay = (
      <>
        <div className={sc('body')}>
          <InnerMeeting meetingID={ID} className={sc('inner-meeting')} layout={layout} />
          {showRoster && (
            <WebexMemberRoster
              destinationID={ID}
              destinationType={DestinationType.MEETING}
              className={sc('member-roster')}
              onClose={() => adapter.meetingsAdapter.toggleRoster(ID)}
            />
          )}
          {showToast && <Badge className={sc('media-state-toast')}>{toastText}</Badge>}
        </div>
        <WebexMeetingControlBar
          meetingID={ID}
          className={sc('control-bar')}
          controls={controls}
          collapseRangeStart={controlsCollapseRangeStart}
          collapseRangeEnd={controlsCollapseRangeEnd}
          tabIndexes={controlsTabIndexes}
        />
        {settings.visible && (
          <Modal
            onClose={() => adapter.meetingsAdapter.toggleSettings(ID)}
            otherClassName={sc('settings')}
            title="Settings"
            ariaLabel="Meeting settings window"
          >
            <WebexSettings meetingID={ID} />
          </Modal>
        )}
        {passwordRequired && !meetingPasswordOrPin && state === NOT_JOINED && (
          <Modal
            onClose={() => adapter.meetingsAdapter.clearPasswordRequiredFlag(ID)}
            otherClassName={[sc('authentication')]}
            onBack={authModal === 'host' && (() => setAuthModal('guest'))}
            ariaLabel={authModal === 'guest' ? 'Meeting guest authentication' : 'Meeting host authentication'}
          >
            {
              authModal === 'guest'
                ? (
                  <WebexMeetingGuestAuthentication
                    meetingID={ID}
                    className={sc('authentication-guest')}
                    switchToHostModal={() => setAuthModal('host')}
                    style={style}
                  />
                )
                : <WebexMeetingHostAuthentication meetingID={ID} className={sc('authentication-host')} />
            }
          </Modal>
        )}
      </>
    );
  }

  return (
    <div className={cssClasses} style={style} ref={mediaRef}>
      {logo && <div className={sc('logo')}>{logo}</div>}
      {meetingDisplay}
    </div>
  );
}

WebexMeeting.propTypes = {
  className: PropTypes.string,
  controls: PropTypes.func,
  controlsCollapseRangeStart: PropTypes.number,
  controlsCollapseRangeEnd: PropTypes.number,
  controlsTabIndexes: PropTypes.func,
  layout: PropTypes.string,
  logo: PropTypes.node,
  meetingID: PropTypes.string,
  meetingPasswordOrPin: PropTypes.string,
  participantName: PropTypes.string,
  style: PropTypes.shape(),
};

WebexMeeting.defaultProps = {
  className: '',
  controls: (isActive) => (
    isActive
      ? ['mute-audio', 'mute-video', 'share-screen', 'member-roster', 'settings', 'leave-meeting']
      : ['mute-audio', 'mute-video', 'settings', 'join-meeting']
  ),
  controlsCollapseRangeStart: 0,
  controlsCollapseRangeEnd: -1,
  controlsTabIndexes: (isActive) => (
    isActive
      ? [1, 2, 3, 4, 5, 6]
      : [2, 3, 4, 1]
  ),
  layout: undefined,
  logo: undefined,
  meetingID: undefined,
  meetingPasswordOrPin: '',
  participantName: '',
  style: undefined,
};
