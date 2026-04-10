@echo off
echo Dang gom tat ca cac thay doi...
git add .
echo.
echo Dang luu vao lich su...
git commit -m "Auto update"
echo.
echo Dang day len trang chu GitHub...
git push origin main
echo.
echo ====================================================
echo HOAN TAT! Ma nguon cua ban dang duoc Deploy tren server.
echo Tren GitHub Actions, website moi se duoc xuat ban sau 1-2 phut nua!
echo ====================================================
pause
