import FormatChecker from "../framework/FormatChecker"

const jobRegexp = '^\\*\\*(\\[ ([^\\]])* \\] - ){2}[a-zA-Z ]+\\*\\*\n(.*\n?)*$'

export default new FormatChecker({
  enabled: true,
  name: 'Job',
  description: 'Force le formattage du channel #jobs.',
  channelName: 'jobs',
  regexp: new RegExp(jobRegexp),
})
