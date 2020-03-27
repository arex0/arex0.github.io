**live system**
```bash
sudo mount /dev/sda1 /mnt
sudo mount --bind /dev /mnt/dev 
sudo mount --bind /dev/pts /mnt/dev/pts 
sudo mount --bind /proc /mnt/proc
sudo mount --bind /sys /mnt/sys
sudo chroot /mnt
sudo grub-install --root-directory=/mnt /dev/sda
sudo grub-install --recheck /dev/sda
update-grub
exit &&
sudo umount /mnt/dev &&
sudo umount /mnt/dev/pts &&
sudo umount /mnt/proc &&
sudo umount /mnt/sys &&
sudo umount /mnt
```