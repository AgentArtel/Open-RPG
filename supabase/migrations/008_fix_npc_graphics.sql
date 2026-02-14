-- Fix: elder-theron and test-agent had graphic = 'male' in seeds,
-- but the only available spritesheets are 'female' and 'hero'.
-- Update to match what the YAML configs already had (female).

update agent_configs
  set graphic = 'female'
  where id in ('elder-theron', 'test-agent')
    and graphic = 'male';
