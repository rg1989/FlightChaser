#!/usr/bin/env python3
"""Air Astana 1388: the Lisbon Approach radio on the scenario clock, and its captions.

The recording is the LiveATC.net feed of Lisbon Approach as a YouTube upload carries it (vhpHnLLjqrA, 99 min from
13:30 UTC). It is real time but for one splice: seconds 3791.95 to 3909.9 repeat what came just before, and are cut.
Clock: the Mayday call falls on the report's 13:32:48 with second 0 at 13:30:03. After the cut the distances spoken on
the radio agree with the track (75, 40 and 23 miles to Beja). It can be about 10 s out: no time-stamped record exists.

No official transcript of the radio exists either. The lines below are our own: a machine heard each transmission
(Whisper, one transmission at a time, found by its loudness, so every start time is the transmission's own) and they
were read against two further passes; a word the passes do not agree on is [unintelligible], a line whose speaker is
not plain is left out. Nobody has checked them by ear. In transcript.csv they carry q=H and the caption says "as heard".

  radio.py                 writes public/scenarios/kc1388/transcript.csv
  radio.py audio SRC.m4a   also builds public/scenarios/kc1388/local/atc.m4a (git never publishes it)
"""
import csv, os, subprocess, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'public', 'scenarios', 'kc1388')
T0 = 13 * 3600 + 30 * 60 + 3  # the clock at the recording's second 0
CUT = (3791.95, 3909.9)  # the repeated stretch
END = 5680.0  # just after the hand-over to Beja; the rest is other traffic

K, A, F = 'KZR', 'APP', 'F16'
# (second in the recording, speaker, to, words)
LINES = [
    (162.5, K, A, '[unintelligible] 1388, Mayday, Mayday, Mayday.'),
    (172.0, A, K, 'Kilo Zulu Romeo 1388, go ahead.'),
    (179.6, A, K, 'Kilo Zulu Romeo 1388, roger, Mayday, go ahead with your request.'),
    (186.2, K, A, 'Standby, standby, 1388.'),
    (238.8, K, A, 'Mayday, Mayday, Mayday. We have control problem.'),
    (250.3, A, K, 'Kilo Zulu Romeo 1388, roger, Mayday. Do you have any requests?'),
    (291.7, A, K, 'Kilo Zulu Romeo 1388, descend to 2,500 feet, QNH 1010.'),
    (297.5, K, A, 'Standby, 1388, on the heading 150 [unintelligible]'),
    (301.7, A, K, 'Kilo Zulu Romeo 1388, descend to 2,500 feet, QNH 1010.'),
    (310.3, A, K, 'Negative, Kilo Zulu Romeo 1388, now maintain 4,000 feet.'),
    (313.9, K, A, 'Roger, maintain 4,000 feet and [unintelligible] report when ready to proceed to Alverca.'),
    (329.1, K, A, 'Astanaline 1388, request back to airport.'),
    (334.5, A, K, 'Kilo Zulu Romeo 1388, turn left or right as you wish, heading 280.'),
    (440.3, K, A, "Astanaline 1388, we have flight control problem, [unintelligible] flight control capability, we're climbing 10,000 [unintelligible] 1010, present heading."),
    (453.7, A, K, '1388, roger, climb to 10,000 feet, QNH 1010.'),
    (459.0, K, A, 'Continue climbing, flight level 100, QNH 1010.'),
    (665.5, A, K, 'Unreadable, please say again.'),
    (667.6, K, A, '1388, requesting heading for ditching, ditching.'),
    (675.0, K, A, '[unintelligible] we need a vectoring to the sea, for the ditching, ditching, please.'),
    (682.3, A, K, '1388, unreadable, confirm you need vectors to land or to ditch?'),
    (690.0, K, A, '[unintelligible] ditching, ditching [unintelligible] uncontrollable [unintelligible]'),
    (708.3, A, K, '1388, fly heading 260.'),
    (712.0, K, A, '260.'),
    (781.0, K, A, '[unintelligible] 1388, please [unintelligible] vectoring to the sea area, please. [unintelligible] completely unstable.'),
    (789.9, A, K, "1388, you have the river if you turn by the left or right, heading 260, it's the closest."),
    (797.0, K, A, '260, river, okay. Maybe ocean [unintelligible]'),
    (801.8, A, K, 'The ocean is 40 miles from your position, sir.'),
    (807.2, K, A, 'Okay [unintelligible] us to the river, please.'),
    (811.9, A, K, 'Kilo Zulu Romeo 1388, left heading 260.'),
    (815.7, K, A, 'Left heading 260.'),
    (1075.7, K, A, '[unintelligible] Astanaline 1388, we are [unintelligible] aircraft completely uncontrolled, so we request vectoring [unintelligible]'),
    (1087.1, A, K, 'Kilo Zulu Romeo 1388, turn left, heading 260 for the river.'),
    (1092.4, K, A, '260 for the river, Astanaline 1388.'),
    (1212.5, K, A, 'Astanaline 1388.'),
    (1215.2, A, K, '1388, go ahead.'),
    (1218.2, K, A, 'We cannot control the airplane.'),
    (1220.3, K, A, 'We are under Mayday. Do you have any areas where weather is better? At least we need visual conditions.'),
    (1229.5, A, K, '1388, roger, Mayday, standby for any information. I believe south the weather is better, sir.'),
    (1235.5, K, A, 'South weather is better, okay.'),
    (1308.7, A, K, 'Kilo Zulu Romeo 1388, when able, [unintelligible] people on board and fuel.'),
    (1313.9, K, A, 'We have 10 tons, 6 people on board. Airplane is completely uncontrollable, flight control problem.'),
    (1323.5, K, A, 'We have manual control now. We would like to plan to land on the sea, at least, if possible.'),
    (1330.5, A, K, '[unintelligible] the sea and not the river?'),
    (1330.9, K, A, 'Maybe sea is better, if we can proceed there, please.'),
    (1338.9, K, A, 'And we need a better weather.'),
    (1504.3, A, K, '1388, you can reach the sea on heading 210 from your present position. And you will find the sea in approximately 36 miles.'),
    (1627.8, K, A, 'Astanaline 1388, confirm heading to the sea. We need ditching.'),
    (1634.2, A, K, 'Kilo Zulu Romeo 1388, fly heading 210, sir.'),
    (1638.0, K, A, '210 heading.'),
    (1755.7, K, A, 'Astanaline 1388, able to turn left 15 degrees.'),
    (1762.3, K, A, 'We need a vectoring to the sea area [unintelligible] please.'),
    (1767.7, A, K, 'Kilo Zulu Romeo 1388, continue on this present [unintelligible]'),
    (2197.3, K, A, 'Astanaline 1388, control, our position in relation to sea, please.'),
    (2203.0, A, K, 'If you fly southbound, you need to go another 36 miles.'),
    (2210.7, K, A, 'Fly south, 36 miles, okay.'),
    (2214.5, A, K, "South-west, 38 miles and you'll reach the sea."),
    (2309.9, K, A, 'Astanaline 1388, [unintelligible] vectoring to the sea, please.'),
    (2314.9, A, K, "Astanaline 1388, turn left and I'll tell you to stop the turn when you're in a good direction to the sea."),
    (2322.1, K, A, '[unintelligible] river below. What is the weather below us?'),
    (2334.6, A, K, "1388, we have rain at the present time. I don't know the weather below you."),
    (2344.5, K, A, 'On this heading, we are now heading to the north [unintelligible]'),
    (2348.7, A, K, "If you turn another 30 degrees left, you'll reach the sea in 40 miles."),
    (2474.7, A, K, "If you keep the heading, you'll reach the sea in 43 miles."),
    (2486.5, K, A, 'On that heading, 43 miles to the sea.'),
    (2849.8, K, A, '[unintelligible] Astanaline 1388.'),
    (2854.9, K, A, 'We are in thunderstorm now. [unintelligible] now heading 073.'),
    (2865.0, K, A, '[unintelligible] where can we land?'),
    (2869.5, A, K, "You're flying on heading 073, as you said."),
    (3044.9, K, A, 'On this heading, can we proceed to the sea?'),
    (3049.9, A, K, "You're always turning by the left. That heading is north now. If you can fly westbound, you'll reach the sea."),
    (3081.7, A, K, "1388, there's a couple of F-16 fighters, they're flying your way, trying to assist you in your navigation."),
    (3092.7, K, A, "Yes sir, we're expecting emergency ditching or landing, the airplane is completely uncontrollable."),
    (3100.0, A, K, "[unintelligible] they're reaching [unintelligible] probably four or five minutes."),
    (3108.0, K, A, 'With this heading, can we reach the sea?'),
    (3110.9, A, K, 'With that heading, you can, in 38 miles.'),
    (3114.0, K, A, '38 miles, okay.'),
    (3198.0, A, K, 'You have a river [unintelligible] south-east of your position.'),
    (3365.2, A, K, 'Astanaline 1388, the F-16 fighters [unintelligible] your position now.'),
    (3530.1, A, F, 'Bullet 21, traffic in distress, cannot maintain heading nor altitude, is flying at level 120 and climbing and descending all the time.'),
    (3637.9, A, K, "1388, you're now 20 miles north of [unintelligible] position you had. [unintelligible] north-west, you'll reach the sea in about 44 miles."),
    (3658.3, K, A, 'Now we are on [unintelligible] 100, heading 300.'),
    (3671.7, A, K, 'You have the sea 26 miles west of your position.'),
    (3718.9, K, A, 'Control, Astanaline 1388 [unintelligible] heading south, can we reach the sea?'),
    (3725.4, A, K, "You can also reach the sea if you head south, it's 57 miles."),
    (3732.5, K, A, 'Copy, we are now turning to the left, south.'),
    (3739.9, A, K, "If you fly south or south-west, you'll reach the sea."),
    (3745.1, K, A, 'Okay, south-west.'),
    (3981.5, K, A, 'Control, Astanaline 1388, can we reach sea on this heading now, eastbound?'),
    (3986.6, A, K, "Eastbound won't take you to the sea. You cannot reach the sea on that heading. You need to turn left or right and fly westbound."),
    (3993.5, K, A, 'Copy, westbound.'),
    (4091.1, F, K, 'Kilo Zulu Romeo, this is [unintelligible], this is Air Defence. How do you read?'),
    (4098.0, F, K, '[unintelligible] we are 60 miles north of your position. We will try to intercept you and give you any assistance required. How can we assist you?'),
    (4110.0, K, F, 'We have now a flight control problem [unintelligible] we will make ditching on sea.'),
    (4121.7, F, K, 'Confirm you are proceeding for a ditching over the sea?'),
    (4128.9, K, F, 'Yes sir, we are trying [unintelligible] ditching on the sea.'),
    (4144.0, F, K, "Kilo Zulu Romeo, Faro should be Victor Mike Charlie. Don't you have fuel to reach Faro?"),
    (4170.0, A, K, 'You are closer if you fly westbound to the sea.'),
    (4211.0, A, K, 'Astanaline 1388, turn right heading 210.'),
    (4215.5, K, A, 'Right heading 210.'),
    (4221.9, K, F, 'We are not able to reach Faro.'),
    (4229.5, K, A, 'We need ditching. [unintelligible]'),
    (4233.5, A, K, 'Copy, ditching.'),
    (4358.4, A, K, 'Astanaline 1388, if you continue that heading, you have an aerodrome, a civilian aerodrome, 13 miles ahead.'),
    (4466.1, A, K, 'Astanaline 1388, the maintenance officer from Alverca will try and contact you on this frequency as well.'),
    (4514.6, A, K, "You're flying away from the sea. You're flying into Spanish territory."),
    (4536.3, A, K, "Astanaline 1388, you'll probably find better weather if you move further east."),
    (4544.2, K, A, '[unintelligible] Astanaline 1388, our aircraft is controllable.'),
    (4549.7, A, K, 'Roger. Confirm intentions.'),
    (4558.3, K, A, 'Astanaline 1388, we need [unintelligible] airport with good weather.'),
    (4565.7, A, K, 'Could you say again, please?'),
    (4567.6, K, A, 'We need airport with good weather, with visibility, okay.'),
    (4574.5, A, K, 'You have an aerodrome with good weather south of your position, 135 miles. Can you fly that?'),
    (4586.8, A, K, 'Astanaline 1388, turn right heading 190.'),
    (4603.2, F, K, 'Say again, are you now able to maintain a heading and an altitude?'),
    (4612.0, F, K, 'Okay, copy all. If you wish, we can intercept you and guide you to the aerodrome for you to land safely.'),
    (4619.0, F, K, 'Are you able to maintain 18,000?'),
    (4625.9, K, F, 'Now maintaining 190.'),
    (4629.2, A, F, 'Bullet 21, verify Faro will be the divert aerodrome?'),
    (4643.1, A, K, 'Astanaline 1388, you have Beja aerodrome, will be a shorter route, 70 miles south.'),
    (4655.8, A, K, 'Astanaline 1388, right turn heading 195.'),
    (4660.0, K, A, 'Right heading 195.'),
    (4665.7, F, A, 'Lisboa, Bullet 21, confirm Beja will be suitable to divert this airplane?'),
    (4675.8, A, K, "Astanaline 1388, Beja, it's a suitable aerodrome for you and they're expecting you. It's on a right or left turn, heading 195, 75 miles."),
    (4688.5, F, K, "[unintelligible] if you take a right turn now, you'll be more or less aligned with runway 19 in Beja."),
    (4758.4, A, K, 'Astanaline 1388, expect runway 19 and fly heading 205.'),
    (4766.6, K, A, '205.'),
    (4769.1, A, F, 'Bullet 21, able to escort Astanaline 1388 to Beja?'),
    (4774.9, F, A, "Bullet 21 [unintelligible] now 19 miles, closing in, and I'm Victor Mike Charlie."),
    (4821.3, F, K, "[unintelligible] turn right now, approximately heading 200, you'll be more or less aligned with the final runway 19 in Beja."),
    (4855.3, A, K, 'Astanaline 1388, on right heading 210 will be runway 19 [unintelligible] a straight-in approach.'),
    (4865.2, F, K, "I'm now 10 miles from you. If you wish, if you need, I can intercept you and you can fly on my wing. How do you read me?"),
    (4916.3, A, K, 'Astanaline 1388, this is Lisbon Approach, I read you 5. We have the F-16 trying to guide you in, if you can follow them.'),
    (4939.7, F, K, '[unintelligible] four miles from you. Verify maintaining 18,000?'),
    (4943.5, K, F, '[unintelligible] yes, we confirm, luckily now airplane is under control [unintelligible] very reduced capability of control. We need any assistance to land at an airport with a good weather, because we [unintelligible] problem with a flight control.'),
    (4975.2, A, K, 'Astanaline 1388, heading is good, course to Beja. We have runway 19, the weather: wind 190 degrees, 17 knots, visibility 10 kilometres or greater, clouds scattered at 3,000 feet, broken at 4,800, temperature 19, dew point 14, QNH 1011.'),
    (5000.9, F, A, '[unintelligible] maintain altitude, they are still manoeuvring aggressively from one side to the other.'),
    (5008.4, F, K, '[unintelligible] F-16 on your left wing.'),
    (5014.9, K, F, 'Okay, could you please give us space, please, because we have [unintelligible]'),
    (5036.0, A, K, 'You can descend initially to 8,000 feet, QNH 1011, and turn right heading 240.'),
    (5047.0, K, A, 'Turning right heading 240 and descending.'),
    (5066.4, F, A, '[unintelligible] request a clear descent altitude all the way until Beja. They are having still trouble controlling the airplane.'),
    (5085.9, K, A, "Astanaline 1388, sorry, we're now turning heading 210 and descending 8,000."),
    (5093.3, A, K, 'Astanaline 1388, continue right heading 220.'),
    (5098.3, F, A, '[unintelligible] Bullet 21 [unintelligible] runway 19, final heading 189, they need to turn even further to the right.'),
    (5108.0, K, A, "We're turning further to the right."),
    (5116.0, F, K, 'If you are able to follow me, I can guide you all the way until the final runway 19.'),
    (5124.3, K, F, 'We see you.'),
    (5129.9, K, A, "[unintelligible] with the heading, and it's better for us to have ATC control."),
    (5134.1, A, K, 'Astanaline 1388, right heading 230, and do you have the F-16 in sight?'),
    (5154.2, K, A, 'Say again?'),
    (5154.9, A, K, 'Do you have the F-16 in sight?'),
    (5158.5, K, A, 'Yeah, yeah, we have in sight.'),
    (5159.7, A, K, "Okay, just follow him, he'll take you in."),
    (5190.9, A, K, 'Astanaline 1388, just to confirm, are you able to follow the F-16 to join final for runway 19 at Beja?'),
    (5200.0, K, A, 'Astanaline, we try [unintelligible] we have a complete manual control, we better to keep the heading [unintelligible]'),
    (5210.9, A, K, 'Copy that, sir. Astanaline 1388, fly heading 225.'),
    (5218.9, K, A, 'Fly heading 225.'),
    (5223.1, F, K, "Okay, I'm visual now with you."),
    (5235.6, A, K, "Astanaline 1388, 45 miles to Beja. Call me when you're visual with the ground."),
    (5253.0, K, A, 'Can you spell the name of the airport by letters?'),
    (5256.1, A, K, 'Okay, by letters: Lima Papa Bravo Juliet. And Beja: Bravo Echo Juliet Alpha.'),
    (5265.5, K, A, 'Lima Papa Bravo Juliet, Beja. Thank you.'),
    (5274.8, F, K, '[unintelligible] to intercept the ILS final, we are now 40 miles, you need to turn more to the right, I would say heading 230, something like that.'),
    (5285.6, F, K, 'And if you can, there are some big holes just in front of you, if you can descend and always maintain visual with the ground, that should be nice as well.'),
    (5295.8, K, F, 'Yeah, we have a visual with the ground, we [unintelligible] doing the best. Thank you [unintelligible] we appreciate your assistance.'),
    (5303.8, F, K, 'Okay, ILS [unintelligible] will be 110.3 and final heading 189.'),
    (5376.2, K, A, 'Astanaline 1388, we need a little bit of time to descend. We will descend and maintain 8,000.'),
    (5443.4, A, K, 'Astanaline 1388, heading is good. For Beja it will make about a 9-mile final.'),
    (5463.8, A, K, 'Astanaline 1388, minimum altitude 3,000 feet, QNH 1011.'),
    (5468.6, K, A, 'Minimum 3,000 feet, 1011. [unintelligible] weather conditions [unintelligible] now?'),
    (5475.0, A, K, 'The weather is fair: wind 190 degrees, 17 knots, visibility 10 kilometres or greater, clouds scattered at 3,000, broken at 4,800.'),
    (5529.4, A, K, 'Astanaline 1388, 23 miles to the field. Call me if you have the field in sight. For a longer final [unintelligible] heading 230.'),
    (5556.9, A, K, 'Astanaline 1388, transition level 55, below that QNH 1011.'),
    (5656.1, A, K, '[unintelligible] Astanaline 1388, change now with Beja on 130 decimal 1.'),
    (5670.0, K, A, '[unintelligible] with Beja, frequency 130 decimal 1.'),
]


def file_second(t):
    """A second of the source recording as a second of local/atc.m4a (the repeat is cut out)."""
    assert not CUT[0] <= t < CUT[1], t
    return t if t < CUT[0] else t - (CUT[1] - CUT[0])


def clock(t):
    s = T0 + file_second(t)
    return '%02d:%02d:%04.1f' % (s // 3600, s % 3600 // 60, s % 60)


def write_transcript():
    with open(os.path.join(ROOT, 'transcript.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['time', 'dur', 'speaker', 'to', 'channel', 'lang', 'text', 'original', 'q', 'src'])
        for i, (t, who, to, text) in enumerate(LINES):
            room = LINES[i + 1][0] - t if i + 1 < len(LINES) else 20  # a long line stays until the next, 18 s at most
            dur = '' if len(text) <= 100 else '%.1f' % max(6.0, min(18.0, 0.07 * len(text), max(room, 6.0)))
            w.writerow([clock(t), dur, who, to, 'radio', 'en', text, '', 'H', 'LATC'])
    print(len(LINES), 'lines,', clock(LINES[0][0]), 'to', clock(LINES[-1][0]))


def build_audio(src):
    dst = os.path.join(ROOT, 'local', 'atc.m4a')
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    cut = f'[0:a]atrim=0:{CUT[0]},asetpts=PTS-STARTPTS[a];[0:a]atrim={CUT[1]}:{END},asetpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=0:a=1[o]'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-filter_complex', cut, '-map', '[o]', '-ac', '1', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', dst], check=True)
    print(dst, '%.1f s' % file_second(END))


if __name__ == '__main__':
    write_transcript()
    if len(sys.argv) > 2 and sys.argv[1] == 'audio':
        build_audio(sys.argv[2])
