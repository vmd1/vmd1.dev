---
date: '2025-05-21T09:30:00Z'
draft: false
title: 'Server Authentication in the lab'
tags:
- Lab
- Guide
- Authentication
---
## Why?

One of the central aspects of my setup is the LLDAP server. This allows all services to authenticate using the same credentials, meaning users just need to remember one set of logins. One thing I wanted to do was to ensure the servers also authenticated against the same server. 

## Let’s get started

I initially started off by following the guide on the LLDAP repository to setup NSLCD in combination with LLDAP, however I soon found the NSLCD was no longer actively supported. This meant that it was quite lacking in the feature space, and often had weird compatibility issues. 

> Enter: 
SSSD (System Security Services Daemon) is **a software that manages access to remote directory services and authentication mechanisms, primarily used in Linux environments.**
> 

Time to read the docs for once!

https://sssd.io/docs/ldap/ldap-introduction.html

## My config, with personal data redacted, of course

After a bit of tinkering, I settled on the following config:

```jsx
[sssd]
config_file_version = 2
# Change the domain below. It must match with the one in the [domain/] part
domains = example.com

[nss]

[pam]

# Put the same domain here
[domain/example.com]
id_provider = ldap
auth_provider = ldap
chpass_provider = ldap
ldap_schema = rfc2307
# Place your LDAP server url here
ldap_uri = ldaps://lldap.example.com:6360/
# Put your LDAP dc here
ldap_search_base = dc=example,dc=com

# Bind credentials
# Bind user username (Should be in group lldap_strict_readonly)
ldap_default_bind_dn = uid=binduser,ou=people,dc=example,dc=com
# Bind user password
ldap_default_authtok = bindpassword

# TLS settings
ldap_tls_reqcert = demand
# Put the certificate you generate for LDAPS here
ldap_tls_cacert = YOUR-LDAP-CERT

# User mappings
# Put your LDAP dc here
ldap_user_search_base = ou=people,dc=example,dc=com
ldap_user_object_class = posixAccount
ldap_user_name = uid
ldap_user_gecos = uid
ldap_user_uid_number = uidNumber
ldap_user_gid_number = gidNumber
ldap_user_home_directory = homeDirectory
ldap_user_shell = unixShell

# Uncomment for SSH Key Sync setup
ldap_user_ssh_public_key = sshPublicKey

# Group mappings
# Put your LDAP dc here
ldap_group_search_base = ou=groups,dc=example,dc=com
ldap_group_object_class = groupOfUniqueNames
ldap_group_name = cn
ldap_group_member = uniqueMember

access_provider = permit
cache_credentials = true
```

I had some issues regarding getting groups to work, because LLDAP uses a non-standard schema for grouping, and so I had to adapt the defaults to work with LLDAP. SSSD’s logging also wasn’t great, but I found out that you can run the command `sudo sssctl config-check` to validate your config file, which helped a lot in debugging why things weren’t working.

The move to SSSD also meant that I could setup sshPublicKey sync, meaning that I could use the same public key to login to all the servers, while only actually storing it on the node running LLDAP.

I thought it might be worthwhile to send it in as a pull request so that the guide in the repository was updated: https://github.com/lldap/lldap/pull/1146, and if any of you want to try it out yourself, here’s a guide:

# Unix PAM with SSSD

## Configuring LLDAP

### Configure LDAPS

You **must** use LDAPS. You MUST NOT use plain LDAP. Even over a private network this costs you nearly nothing, and passwords will be sent in PLAIN TEXT without it.

```jsx
[ldaps_options]
enabled=true
port=6360
cert_file="cert.pem"
key_file="key.pem"
```

You can generate an SSL certificate for it with the following command. The `subjectAltName` is REQUIRED. Make sure all domains are listed there, even your `CN`.

```bash
openssl req -x509 -nodes -newkey rsa:4096 -keyout key.pem -out cert.pem -sha256 -days 36500 -nodes -subj "/CN=lldap.example.net" -addext "subjectAltName = DNS:lldap.example.net"
```

### Setting up the custom attributes

You will need to add the following custom attributes to the **user schema**.

- uidNumber (integer)
- gidNumber (integer, multiple values)
- homeDirectory (string)
- unixShell (string)
- sshPublicKey (string) (only if you’re setting up SSH Public Key Sync)

You will need to add the following custom attributes to the **group schema.**

- gidNumber (integer)

You will now need to populate these values for all the users you wish to be able to login.

## Client setup

### Install the client packages

You need to install the packages `sssd` `sssd-tools` `libnss-sss` `libpam-sss` `libsss-sudo` .

E.g. on Debian/Ubuntu

```bash
sudo apt update; sudo apt install -y sssd sssd-tools libnss-sss libpam-sss libsss-sudo
```

### Configure the client packages

Use your favourite text editor to create/open the file `/etc/sssd/sssd.conf` .

E.g. Using nano

```bash
sudo nano /etc/sssd/sssd.conf
```

Insert the contents of the provided template (sssd.conf), but you will need to change some of the configuration in the file. Comments have been made to guide you. The config file is an example if your LLDAP server is hosted at `lldap.example.com` and your domain is `example.com` with your dc being `dc=example,dc=com`.

SSSD will **refuse** to run if it’s config file is world-readable, so apply the following permissions to it:

```bash
sudo chmod 600 /etc/sssd/sssd.conf
```

Restart SSSD to apply any changes:

```bash
sudo systemctl restart sssd
```

Enable automatic creation of home directories

```bash
sudo pam-auth-update --enable mkhomedir
```

## Permissions and SSH Key sync

### SSH Key Sync

In order to do this, you need to setup the custom attribute `sshPublicKey` in the user schema. Then, you must uncomment the following line in the SSSD config file (assuming you are using the provided template):

```bash
sudo nano /etc/sssd/sssd.conf
```

```jsx
ldap_user_ssh_public_key = sshPublicKey
```

And the following to the bottom of your OpenSSH config file:

```bash
sudo nano /etc/ssh/sshd_config
```

```bash
AuthorizedKeysCommand /usr/bin/sss_ssh_authorizedkeys
AuthorizedKeysCommandUser nobody
```

Now restart both SSH and SSSD:

```bash
sudo systemctl restart ssh
sudo systemctl restart sssd
```

### Permissions Sync

Linux often manages permissions to tools such as Sudo and Docker based on group membership. There are two possible ways to achieve this.

**Number 1**

**If all your client systems are setup identically,** you can just check the group id of the local group, i.e. Sudo being 27 on most Debian and Ubuntu installs, and set that as the gid in LLDAP. For tools such as docker, you can create a group before install with a custom gid on the system, which must be the same on all, and use that GID on the LLDAP groups:

- Sudo (e.g. 27)
- Docker (e.g. 722)

```jsx
sudo groupadd docker -g 722
```

**Number 2**

Create a group in LLDAP that you would like all your users who have sudo access to be in, and add the following to the bottom of `/etc/sudoers` .

E.g. if your group is named `lldap_sudo`

```bash
%lldap_sudo ALL=(ALL:ALL) ALL
```

## Debugging

To verify your config file’s validity, you can run the following command

```jsx
sudo sssctl config-check
```

To flush SSSD’s cache

```jsx
sudo sss_cache -E
```