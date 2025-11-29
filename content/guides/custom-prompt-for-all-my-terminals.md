---
date: '2025-09-25T10:05:36Z'
draft: false
title: 'Custom Prompt for All My Terminals'
tags:
- Linux
- Windows
- Guides
---
What’s the first thing you normally tend to interact with when you connect to a machine remotely. That’s right - the terminal, and so ensuring it’s as useful as possible is always very helpful. There’s many options out there for doing so, from oh-my-bash to oh-my-posh, but I wanted something a bit more portable.

> Enter: Starship - the minimal, blazing fast, and extremely customizable *prompt* for any shell
> 

## Installing Starship

Installing Starship is relatively simple, and the docs for doing so can be found [here](https://starship.rs/guide/#%F0%9F%9A%80-installation).

However, if you’re like me and want a more portable setup, you’ll have to download the binaries from their GitHub releases page, found [here](https://github.com/starship/starship/releases).

Place the extracted binary (I’ll be doing this on Linux) in a location accessible on all servers.

```bash
mkdir $HOME/.bin
mv $HOME/Downloads/starship $HOME/.bin
chmod +x $HOME/.bin/starship
```

Add the following to the bottom of your `.bashrc`, replacing `SHELL_NAME` with the name of your shell e.g. bash:

```bash
eval "$(starship init SHELL_NAME)"
```

## Configuring Starship

Starship’s docs explain how to configure starship pretty well, check ‘em out [here](https://starship.rs/config/). 

> Note: Chances are, to use any symbols you’ll need a Nerd Font installed. I use [CascadiaCode Nerd Font](https://github.com/ryanoasis/nerd-fonts/releases/download/v3.4.0/CascadiaCode.zip)
> 

> Note 2: If your using VSCode, ensure .config/ is a trusted folder and use the following extension for syntx highlighting: [Even Better TOML](https://marketplace.visualstudio.com/items?itemName=tamasfe.even-better-toml)
> 

![image.png](https://cdn.848226.xyz/v1/blog/media/posts/Custom-Prompt-for-all-my-terminals/prompt.png)

Here’s my config, which can also be found [here](https://gist.github.com/vmd1/2e83d546098362e5dfb4c577ebbddaca).

```toml
# Get editor completions based on the config schema
"$schema" = 'https://starship.rs/config-schema.json'

# Inserts a blank line between shell prompts
add_newline = true

format = '''
[┌────────────────────────────────────────────>](bold black)
[│](bold black) $username[@](cyan bold)$hostname$localip on $os $shell${custom.uptime}${custom.uptime_win}.
[│](bold black) $time $status$cmd_duration $memory_usage ${custom.cpu_temp}$sudo$docker_context$container$battery
[│](bold black) $directory $git_branch$git_commit$git_metrics$nodejs$python$java$kotlin$cmake$c$cpp$gradle$conda$package
$character'''

[character] # The name of the module we are configuring is 'character'
success_symbol = '[└─>](bold green) ' # The 'success_symbol' segment is being set to '➜' with the color 'bold green'
error_symbol = '[└─>](bold red) '

[battery]
full_symbol = '󱟢 '
charging_symbol = '󱟦 '
discharging_symbol = '󱟤 '

[[battery.display]]
threshold = 100
style = 'bold red'

[status]
symbol = '󱡥 '
success_symbol = '󰾨 '
not_executable_symbol = '󰥕 '
not_found_symbol = '󱦺 '
sigint_symbol = '󱡣 '
signal_symbol = '󱡣 '
format = '[$symbol](bold yellow)'
disabled = false
map_symbol = true

[cmd_duration]
min_time = 10
format = '[$duration](bold yellow)'

[username]
style_user = 'cyan bold'
style_root = 'red bold'
format = '[$user]($style)'
disabled = false
show_always = true
aliases = { "21LModiV" = "vivaan" }

[hostname]
ssh_only = false
ssh_symbol = "  "
format = '[$hostname$ssh_symbol](bold cyan)'
trim_at = '.servers.infra.mdi'
disabled = false
aliases = { "QESS-PW0AVEGV" = "school-pc" }

[os]
format = "[($symbol$name)]($style)"
style = "bold blue"
disabled = false

[localip]
ssh_only = false
format = ' at [$localipv4](bold green)'
disabled = false

[directory]
truncation_length = 8
truncation_symbol = '…/'
read_only = ' 󰌾'
home_symbol = "󱂵 "
use_os_path_sep=false

[memory_usage]
disabled = false
threshold = -1
symbol = "󰍛 "
style = 'bold dimmed blue'
format = '[$symbol$ram \($ram_pct\) $swap \($swap_pct\)](bold purple)'

[shell]
disabled = false
format = '[$indicator](blue bold)'

[sudo]
allow_windows = true
disabled = false
format = '[$symbol]($style)'
symbol = ' '

[time]
disabled = false
format = '[ $time](bright-green)'

[os.symbols]
Alpaquita = " "
Alpine = " "
AlmaLinux = " "
Amazon = " "
Android = " "
Arch = " "
Artix = " "
CachyOS = " "
CentOS = " "
Debian = " "
DragonFly = " "
Emscripten = " "
EndeavourOS = " "
Fedora = " "
FreeBSD = " "
Garuda = "󰛓 "
Gentoo = " "
HardenedBSD = "󰞌 "
Illumos = "󰈸 "
Kali = " "
Linux = " "
Mabox = " "
Macos = " "
Manjaro = " "
Mariner = " "
MidnightBSD = " "
Mint = " "
NetBSD = " "
NixOS = " "
Nobara = " "
OpenBSD = "󰈺 "
openSUSE = " "
OracleLinux = "󰌷 "
Pop = " "
Raspbian = " "
Redhat = " "
RedHatEnterprise = " "
RockyLinux = " "
Redox = "󰀘 "
Solus = "󰠳 "
SUSE = " "
Ubuntu = " "
Unknown = " "
Void = " "
Windows = "󰍲 "

[nodejs]
symbol = " "
format = '[\[$symbol$version\]](bold yellow) '

[docker_context]
symbol = " "
format = '[\[$symbol$context\]](bold yellow)'

[kotlin]
symbol = " "
format = '[\[$symbol$version\]](bold yellow) '

[gcloud]
symbol = "  "
format = '[\[$symbol$account(@$domain)(\($region\))\]](bold yellow) '

[git_branch]
symbol = " "
format = '[\[$symbol$branch(:$remote_branch)\]](bold pink) '

[git_commit]
tag_symbol = '  '
format = '[\[$symbol\($hash$tag\)\]](bold pink) '

[git_metrics]
format = '[\[](bold yelllow)([+$added]($added_style) )([-$deleted]($deleted_style))[\] ]'
added_style = 'bold green'
deleted_style = 'bold red'

[c]
symbol = " "
format = '[\[$symbol($version(-$name) )\]](bold yellow) '

[cpp]
symbol = " "
format = '[\[$symbol($version(-$name) )\]](bold yellow) '

[cmake]
symbol = " "
format = '[\[$symbol($version )\]](bold yellow) '

[conda]
symbol = " "
format = '[\[$symbol$environment\]](bold yellow) '

[java]
symbol = " "
format = '[\[${symbol}(${version} )\]](bold yellow) '

[package]
symbol = "󰏗 "
format = '[\[$symbol$version\]](bold yellow) '

[python]
symbol = " "
format = '[\[${symbol}${pyenv_prefix}(${version})(\($virtualenv\))\]](bold yellow) '

[gradle]
symbol = " "
format = '\[[$symbol($version )]\](bold yellow) '

[custom.cpu_temp]
command = "awk '{printf \"%.1f°C\", $1/1000}' /sys/class/thermal/thermal_zone0/temp"
when = "test -f /sys/class/thermal/thermal_zone0/temp"
format = "[ $output](bold red) "
ignore_timeout = true

[custom.uptime]
command = "awk '{print int($1/86400)\"d\"int(($1%86400)/3600)\"h\"int(($1%3600)/60)\"m\"int($1%60)\"s\"}' /proc/uptime"
when = "test -f /proc/uptime"
style = "bold green"
format = " up for [󰦖 $output]($style)"
ignore_timeout = true

[custom.uptime_win]
command = '''
'$u = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime; $diff = (Get-Date) - $u; Write-Output (\"{0}d{1}h{2}m{3}s\" -f $diff.Days,$diff.Hours,$diff.Minutes,$diff.Seconds)"'
'''
when = 'true'
style = "bold green"
format = " up for [󰦖 $output]($style)"
shell = ["powershell", "-NoProfile", "-Command"]

```

Let’s dive into it

### Initial Setup

At the top, we have the `$schema` line providing completions support in VSCode, and the option `add_newline`  enabled. This adds a newline between each prompt

### Format String

The heart of Starship is the `format` string, which controls how your prompt is structured. This is where you define the overall layout and the order in which modules (username, hostname, git branch, etc.) appear.

In my config, the format block looks like this:

```toml
format = '''
[┌────────────────────────────────────────────>](bold black)
[│](bold black) $username[@](cyan bold)$hostname$localip on $os $shell${custom.uptime}${custom.uptime_win}.
[│](bold black) $time $status$cmd_duration $memory_usage ${custom.cpu_temp}$sudo$docker_context$container$battery
[│](bold black) $directory $git_branch$git_commit$git_metrics$nodejs$python$java$kotlin$cmake$c$cpp$gradle$conda$package
$character'''
```

Here’s the breakdown:

- Line 1: A decorative header arrow to make the prompt visually distinct.
- Line 2: Displays username, hostname, local IP, OS, shell, and system uptime.
- Line 3: Shows current time, last command status, execution time, memory usage, CPU temperature, sudo status, and battery life.
- Line 4: Provides the current directory, git info, and language/runtime versions.
- Line 5: Ends with the `character` module (`└─>`), which acts as the input marker.

This structure keeps information organized and scannable, without cluttering everything onto one line.

### Character Module

The `character` module is what you type after. I’ve customized it to be green (`└─>`) on success, and red on error. This way, at a glance, I know whether the last command failed.

```toml
[character]
success_symbol = '[└─>](bold green) '
error_symbol = '[└─>](bold red) '
```

### Useful Modules

Here are some highlights from my setup:

- Battery: Custom symbols for charging, discharging, and full. Useful on laptops.
- Status & Command Duration: Lets you know if the previous command failed, and how long it took.
- Username & Hostname: With aliases to make long machine names or usernames more human-readable.
- OS & Local IP: Handy when hopping between containers, servers, and WSL instances.
- Memory & CPU Temp: Quick system health checks without extra commands.
- Git Integration: Branch, commit, and metrics (added/deleted lines).
- Language Modules (Node, Python, Java, etc.): Shows active version only when relevant.
- Custom Uptime: Works across Linux and Windows for consistent session context… and look below to see how I made them

## Custom Modules in Starship

Starship lets you define your own modules when the built-ins don’t cut it. These are configured under `[custom.<name>]`. You provide:

- a command (script or one-liner),
- a when condition (so it doesn’t always run),
- optional style/format,
- and a shell if you want something different from your default.

In my config, I’ve got three very handy custom modules:

### `custom.cpu_temp`

```toml
[custom.cpu_temp]
command = "awk '{printf \"%.1f°C\", $1/1000}' /sys/class/thermal/thermal_zone0/temp"
when = "test -f /sys/class/thermal/thermal_zone0/temp"
format = "[ $output](bold red) "
ignore_timeout = true

```

- What it does: Reads CPU temperature directly from Linux’s `thermal_zone0`.
- When it shows: Only if the system exposes `/sys/class/thermal/thermal_zone0/temp` (most Linux distros do).
- Format: Displays with a thermometer icon and bold red style.
- Why it’s useful: You can monitor thermal throttling without extra tools.

On Windows, this won’t work - but since it’s guarded by `when`, it won’t throw errors.

### `custom.uptime`

```toml
[custom.uptime]
command = "awk '{print int($1/86400)\"d\"int(($1%86400)/3600)\"h\"int(($1%3600)/60)\"m\"int($1%60)\"s\"}' /proc/uptime"
when = "test -f /proc/uptime"
style = "bold green"
format = " up for [󰦖 $output]($style)"
ignore_timeout = true

```

- What it does: Reads uptime seconds from `/proc/uptime` and converts it to `XdYhZmWs`.
- Format: Prettily prints `"up for 󰦖 <time>"` in green.
- Why it’s useful: When SSHing into servers, you immediately know how long they’ve been running (great for spotting recent reboots).

### `custom.uptime_win`

```toml
[custom.uptime_win]
command = '''
'$u = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime; $diff = (Get-Date) - $u; Write-Output ("{0}d{1}h{2}m{3}s" -f $diff.Days,$diff.Hours,$diff.Minutes,$diff.Seconds)"'
'''
when = 'true'
style = "bold green"
format = " up for [󰦖 $output]($style)"
shell = ["powershell", "-NoProfile", "-Command"]

```

- What it does: Same as above, but for Windows. It queries system uptime via PowerShell.
- When it shows: Always enabled (`when = 'true'`).
- Shell: Forces PowerShell (since Linux `awk` wouldn’t work).
- Why it’s useful: Cross-platform consistency - whether you’re on Linux, WSL, or Windows, you always see uptime.

## Final Thoughts

Starship is a pretty powerful prompt tool, and it’s also pretty easy to work with, which is always very helpful. Any questions? Let me know in the comments.